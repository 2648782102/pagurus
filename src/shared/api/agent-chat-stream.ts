
import {
  isAgentChatStreamFrame,
  type AgentChatStreamFrame,
} from './agent-chat-contract.js';

export interface AgentChatStream {
  readonly close: () => void;
  readonly cursor: () => string | null;
  readonly connected: () => boolean;
}

export function openAgentChatStream(
  conversationId: string,
  cursor: string | null,
  handlers: {
    readonly onFrame: (frame: AgentChatStreamFrame) => void;
    readonly onError?: (cause: unknown) => void;
    readonly onReconnect?: (cursor: string | null, attempt: number) => void;
  },
): AgentChatStream {
  let current = cursor;
  let source: EventSource | null = null;
  let closed = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let live = false;

  const connect = () => {
    if (closed) return;
    const query = current === null ? '' : `?after=${encodeURIComponent(current)}`;
    source = new EventSource(
      `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}/events${query}`,
    );
    source.addEventListener('agent-chat', (event) => {
      if (closed) return;
      live = true;
      attempt = 0;
      try {
        const value: unknown = JSON.parse((event as MessageEvent<string>).data);
        if (!isAgentChatStreamFrame(value)) {
          handlers.onError?.(new Error('Runtime returned an invalid Agent Chat stream frame.'));
          return;
        }
        if (value.eventId !== null) current = value.eventId;
        handlers.onFrame(value);
      } catch (cause) {
        handlers.onError?.(cause);
      }
    });
    source.onerror = (cause) => {
      if (closed) return;
      live = false;
      handlers.onError?.(cause);
      source?.close();
      source = null;
      attempt += 1;
      const delay = Math.min(8_000, 500 * 2 ** Math.min(attempt - 1, 4));
      handlers.onReconnect?.(current, attempt);
      timer = setTimeout(connect, delay);
    };
  };
  connect();

  return Object.freeze({
    close: () => {
      closed = true;
      if (timer !== null) clearTimeout(timer);
      source?.close();
      source = null;
    },
    cursor: () => current,
    connected: () => live && !closed,
  });
}
