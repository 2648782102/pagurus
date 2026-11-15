import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  getAgentChatConversation,
  isPendingAgentChatState,
  openAgentChatStream,
  type AgentChatConversation,
  type AgentChatStream,
} from '../../shared/api/agent-chat.js';
import { mergeConversation } from './merge-conversation.js';

/**
 * Owns the live transport for one Agent Chat conversation:
 * - resumable SSE while the tab is open;
 * - a short poll only while an assistant message is pending and SSE is not live;
 * - a stalled-stream signal after 45 s without a frame;
 * - a visibility refresh.
 *
 * Conversation contents stay Runtime-published; this hook only merges frames.
 */
export function useAgentChatStream(options: {
  readonly conversation: AgentChatConversation | null;
  readonly supported: boolean;
  readonly setConversation: Dispatch<SetStateAction<AgentChatConversation | null>>;
  readonly onError: (message: string) => void;
}) {
  const { conversation, supported, setConversation, onError } = options;
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamStalled, setStreamStalled] = useState(false);
  const [streamAttempt, setStreamAttempt] = useState(0);
  const lastFrameAtRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const streamRef = useRef<AgentChatStream | null>(null);
  const conversationRef = useRef<AgentChatConversation | null>(null);
  conversationRef.current = conversation;

  const refreshConversation = useCallback(async () => {
    const current = conversationRef.current;
    if (!current) return;
    try {
      setConversation(await getAgentChatConversation(current.id));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message.slice(0, 240) : 'Agent 对话刷新失败');
    }
  }, [onError, setConversation]);

  const pending = conversation?.messages.some((message) =>
    message.author === 'assistant' && isPendingAgentChatState(message.state)) ?? false;

  useEffect(() => {
    if (!pending || (streamConnected && !streamStalled)) {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = window.setInterval(() => { void refreshConversation(); }, 700);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [pending, refreshConversation, streamConnected, streamStalled]);

  useEffect(() => {
    if (!streamConnected || !pending) {
      setStreamStalled(false);
      return;
    }
    const timer = window.setInterval(() => {
      if (Date.now() - lastFrameAtRef.current > 45_000) setStreamStalled(true);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [pending, streamConnected]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshConversation();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshConversation]);

  useEffect(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setStreamConnected(false);
    setStreamAttempt(0);
    if (!supported || !conversation || typeof EventSource === 'undefined') return;
    const current = conversation;
    let closed = false;
    const stream = openAgentChatStream(current.id, null, {
      onReconnect: (_cursor, attempt) => {
        setStreamConnected(false);
        setStreamAttempt(attempt);
      },
      onFrame: (frame) => {
        if (closed) return;
        setStreamConnected(true);
        setStreamStalled(false);
        lastFrameAtRef.current = Date.now();
        setStreamAttempt(0);
        if (frame.kind === 'snapshot' && frame.conversation) {
          const snapshot = frame.conversation;
          setConversation(previous => previous && previous.id !== snapshot.id
            ? previous
            : previous ? mergeConversation(previous, snapshot) : snapshot);
          return;
        }
        if (frame.kind !== 'message' || !frame.message) return;
        const incoming = frame.message;
        setConversation(previous => {
          if (!previous || previous.id !== current.id) return previous;
          const index = previous.messages.findIndex((entry) => entry.id === incoming.id);
          if (index >= 0 && Date.parse(incoming.updatedAt) < Date.parse(previous.messages[index]!.updatedAt)) {
            return previous;
          }
          const messages = index >= 0
            ? previous.messages.map((entry) => entry.id === incoming.id ? incoming : entry)
            : [...previous.messages, incoming].sort((left, right) => left.sequence - right.sequence);
          return { ...previous, messages };
        });
      },
    });
    streamRef.current = stream;
    return () => {
      closed = true;
      stream.close();
      setStreamConnected(false);
      if (streamRef.current === stream) streamRef.current = null;
    };
  }, [conversation?.id, setConversation, supported]);

  return { streamConnected, streamStalled, streamAttempt, refreshConversation };
}
