// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentApp } from '../src/agent/AgentApp.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Agent surface when the Runtime is offline', () => {
  let healthCalls = 0;

  beforeEach(() => {
    healthCalls = 0;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health' || path === '/v1/runtime') {
        healthCalls += 1;
        // First probe fails, the retry succeeds — this is the reconnect path.
        if (healthCalls <= 2) return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve(json(
          path === '/v1/health'
            ? { status: 'ok', service: 'conchbase', apiVersion: 1 }
            : { name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [], agentChatContract: '1.9.0', agentChatPaths: 7 },
        ));
      }
      return Promise.resolve(json({ version: '1.9.0', agents: [], conversations: [], models: [] }));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('explains the outage and offers a retry instead of quoting a transport error', async () => {
    render(<AgentApp />);

    expect(await screen.findByText('连不上本机 Runtime')).toBeTruthy();
    expect(screen.getByText(/对话需要本机 Runtime 在跑/)).toBeTruthy();
    // It must not surface the raw fetch failure as the headline.
    expect(screen.queryByText('Failed to fetch')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '重新连接' }));
    await waitFor(() => expect(screen.queryByText('连不上本机 Runtime')).toBeNull());
  });

  it('says it is still connecting, not that the Runtime is too old', async () => {
    /*
     * Measured on the running app: the first frame said "这个 Runtime 还不支持
     * Agent 对话 · 升级 Runtime 之后这里会自动可用" while the header beside it
     * still read "连接中". The probe had not returned yet — nothing was known
     * to be unsupported — and the screen named the wrong cause and prescribed
     * an upgrade that was not needed.
     *
     * The blocked screen had two branches, disconnected and everything else,
     * so `checking` fell into the unsupported one.
     */
    /* Both probes resolve together; the screen waits for the pair. */
    const releases: Array<() => void> = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health' || path === '/v1/runtime') {
        return new Promise<Response>((resolve) => {
          releases.push(() => resolve(json(
            path === '/v1/health'
              ? { status: 'ok', service: 'conchbase', apiVersion: 1 }
              : { name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [], agentChatContract: '1.9.0', agentChatPaths: 7 },
          )));
        });
      }
      return Promise.resolve(json({ version: '1.9.0', agents: [], conversations: [], models: [] }));
    }));

    render(<AgentApp />);
    expect(await screen.findByText('正在连接本机 Runtime')).toBeTruthy();
    /* The two wrong claims must not be on screen while a probe is in flight. */
    expect(screen.queryByText('这个 Runtime 还不支持 Agent 对话')).toBeNull();
    expect(screen.queryByText(/升级 Runtime/)).toBeNull();
    /* Nor may the reader retry what is already happening. */
    expect(screen.getByRole('button', { name: '连接中…' }).getAttribute('aria-disabled')).toBe('true');

    for (const release of releases) release();
    await waitFor(() => expect(screen.queryByText('正在连接本机 Runtime')).toBeNull());
  });
});
