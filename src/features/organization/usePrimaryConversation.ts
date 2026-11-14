import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getConversationMessages,
  getPrimaryConversation,
  supportsConversationContract,
  type ConversationMessage,
  type PrimaryConversationView,
} from '../../shared/api/conversation.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

export interface PrimaryConversationState {
  readonly supported: boolean;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly view: PrimaryConversationView | null;
  readonly messages: readonly ConversationMessage[];
  readonly cursor: string | null;
  readonly hasMore: boolean;
  readonly error: string | null;
  readonly lastUpdatedAt: string | null;
}

const initialState: PrimaryConversationState = {
  supported: false,
  loading: false,
  refreshing: false,
  view: null,
  messages: [],
  cursor: null,
  hasMore: false,
  error: null,
  lastUpdatedAt: null,
};

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message.slice(0, 240) : '主会话读取失败';
}

function mergeMessages(
  current: readonly ConversationMessage[],
  incoming: readonly ConversationMessage[],
): readonly ConversationMessage[] {
  return Object.freeze([...current, ...incoming]
    .filter((message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index)
    .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id)));
}

export function usePrimaryConversation(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<PrimaryConversationState>(initialState);
  const supported = supportsConversationContract(runtime);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async (signal?: AbortSignal, mode: 'full' | 'incremental' = 'full') => {
    if (!runtime || !supported) {
      setState((value) => ({ ...value, supported, loading: false, refreshing: false, error: null }));
      return;
    }
    setState((value) => ({
      ...value,
      supported: true,
      loading: mode === 'full' ? true : value.loading,
      refreshing: true,
      error: null,
    }));
    try {
      const after = mode === 'incremental' ? stateRef.current.cursor ?? undefined : undefined;
      const [view, page] = await Promise.all([
        getPrimaryConversation(signal),
        getConversationMessages(after, 100, signal),
      ]);
      if (signal?.aborted) return;
      setState((value) => {
        const messages = mode === 'incremental'
          ? mergeMessages(value.messages, page.messages)
          : mergeMessages([], view.messages);
        return {
          ...value,
          supported: true,
          loading: false,
          refreshing: false,
          view,
          messages,
          cursor: page.nextCursor ?? view.nextCursor ?? value.cursor,
          hasMore: page.hasMore || view.hasMore,
          error: null,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
    } catch (cause) {
      if (signal?.aborted) return;
      setState((value) => ({
        ...value,
        loading: false,
        refreshing: false,
        error: errorText(cause),
      }));
    }
  }, [runtime, supported]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal, 'full');
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!supported) return;
    const timer = setInterval(() => {
      const controller = new AbortController();
      void load(controller.signal, 'incremental');
      return () => controller.abort();
    }, 4000);
    return () => clearInterval(timer);
  }, [load, supported]);

  const refresh = useCallback(() => load(undefined, 'incremental'), [load]);
  const openAttentionMessages = useMemo(
    () => state.messages.filter((message) => message.kind === 'attention' && message.state === 'open'
      && message.attentionId !== null && message.expectedVersion !== null),
    [state.messages],
  );

  return { ...state, supported, load, refresh, openAttentionMessages };
}
