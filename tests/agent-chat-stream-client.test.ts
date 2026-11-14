import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_CHAT_CONTRACT_VERSION,
  AGENT_CHAT_PUBLIC_PATHS,
  openAgentChatStream,
  supportsAgentChat,
} from '../src/shared/api/agent-chat.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.8.0', agentChatPaths: 6,
};

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  readonly url: string;
  closed = false;
  onerror: ((cause: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(payload: unknown): void {
    this.listeners.get('agent-chat')?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  fail(): void {
    this.onerror?.(new Error('disconnected'));
  }
}

afterEach(() => {
  FakeEventSource.instances = [];
  vi.unstubAllGlobals();
});

describe('Agent Chat stream client', () => {
  it('gates on 1.8.0 with six published paths', () => {
    expect(AGENT_CHAT_CONTRACT_VERSION).toBe('1.8.0');
    expect(AGENT_CHAT_PUBLIC_PATHS).toHaveLength(6);
    expect(supportsAgentChat(runtime)).toBe(true);
    expect(supportsAgentChat({ ...runtime, agentChatPaths: 5 })).toBe(false);
  });

  it('opens the SSE path with a resume cursor and parses projected frames', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const frames: unknown[] = [];
    const stream = openAgentChatStream('chat_' + 'a'.repeat(24), 'evt_000000000042', {
      onFrame: (frame) => frames.push(frame),
    });
    const source = FakeEventSource.instances[0]!;
    expect(source.url).toContain('/v1/agent-chat/conversations/chat_');
    expect(source.url).toContain('?after=evt_000000000042');

    source.emit({
      version: '1.8.0',
      conversationId: `chat_${'a'.repeat(24)}`,
      kind: 'snapshot',
      eventId: 'evt_000000000042',
      messageId: null,
      message: null,
      conversation: {
        version: '1.8.0',
        id: `chat_${'a'.repeat(24)}`,
        agentId: 'agt_alpha',
        agentRevisionId: 'agr_alpha',
        providerId: 'magpie',
        modelId: 'fixture/model',
        configurationRevisionId: 'cfg_alpha',
        reasoningEffort: 'medium',
        messages: [],
      },
    });
    expect(frames).toHaveLength(1);
    expect((frames[0] as { kind: string }).kind).toBe('snapshot');
    stream.close();
    expect(source.closed).toBe(true);
  });

  it('ignores malformed frames and reports them without throwing', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const errors: unknown[] = [];
    const frames: unknown[] = [];
    openAgentChatStream('chat_' + 'b'.repeat(24), null, {
      onFrame: (frame) => frames.push(frame),
      onError: (cause) => errors.push(cause),
    });
    FakeEventSource.instances[0]!.emit({ version: '1.8.0', kind: 'message' });
    expect(frames).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('reconnects with the last event id after a disconnect', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
    const frames: unknown[] = [];
    const stream = openAgentChatStream('chat_' + 'c'.repeat(24), null, {
      onFrame: (frame) => frames.push(frame),
    });
    const first = FakeEventSource.instances[0]!;
    first.emit({
      version: '1.8.0',
      conversationId: `chat_${'c'.repeat(24)}`,
      kind: 'message',
      eventId: 'evt_000000000077',
      messageId: `amsg_${'d'.repeat(24)}`,
      message: null,
      conversation: null,
    });
    expect(stream.cursor()).toBe('evt_000000000077');
    expect(stream.connected()).toBe(true);
    first.fail();
    expect(stream.connected()).toBe(false);
    vi.advanceTimersByTime(600);
    const second = FakeEventSource.instances[1];
    expect(second).toBeTruthy();
    expect(second!.url).toContain('?after=evt_000000000077');
    stream.close();
    expect(second!.closed).toBe(true);
    vi.useRealTimers();
  });

  it('accepts a health frame without changing the cursor', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const frames: { kind: string }[] = [];
    const stream = openAgentChatStream('chat_' + 'e'.repeat(24), null, {
      onFrame: (frame) => frames.push(frame),
    });
    FakeEventSource.instances[0]!.emit({
      version: '1.8.0',
      conversationId: `chat_${'e'.repeat(24)}`,
      kind: 'health',
      eventId: 'evt_000000000010',
      messageId: null,
      message: null,
      conversation: null,
    });
    expect(frames.map((frame) => frame.kind)).toEqual(['health']);
    expect(stream.cursor()).toBe('evt_000000000010');
    stream.close();
  });
});
