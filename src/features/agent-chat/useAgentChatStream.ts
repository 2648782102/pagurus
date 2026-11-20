import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  getAgentChatConversation,
  isPendingAgentChatState,
  openAgentChatStream,
  type AgentChatConversation,
  type AgentChatStream,
} from '../../shared/api/agent-chat.js';
import { mergeRefresh, applyFrame, applyMessageFrame } from './merge-conversation.js';
import { useAbortablePolling, useTicker } from '../../shared/ui/use-poll.js';
import { errorMessage } from '../../shared/ui/errors.js';

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
  const streamRef = useRef<AgentChatStream | null>(null);
  const conversationRef = useRef<AgentChatConversation | null>(null);
  conversationRef.current = conversation;

  const refreshConversation = useCallback(async (signal?: AbortSignal) => {
    const current = conversationRef.current;
    if (!current) return;
    try {
      const next = await getAgentChatConversation(current.id, signal);
      if (signal?.aborted) return;
      setConversation(mergeRefresh(next));
    } catch (cause) {
      if (signal?.aborted) return;
      onError(errorMessage(cause, 'Agent 对话刷新失败'));
    }
  }, [onError, setConversation]);

  const pending = conversation?.messages.some((message) =>
    message.author === 'assistant' && isPendingAgentChatState(message.state)) ?? false;

  useAbortablePolling(refreshConversation, 700, pending && (!streamConnected || streamStalled));

  useTicker(
    () => {
      if (Date.now() - lastFrameAtRef.current > 45_000) setStreamStalled(true);
    },
    5_000,
    pending && streamConnected,
  );

  useEffect(() => {
    if (!streamConnected || !pending) setStreamStalled(false);
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
          setConversation(applyFrame(frame.conversation));
          return;
        }
        if (frame.kind !== 'message' || !frame.message) return;
        setConversation(applyMessageFrame(frame.message, current.id));
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
