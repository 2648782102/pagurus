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
            : { name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [], agentChatContract: '1.8.0', agentChatPaths: 6 },
        ));
      }
      return Promise.resolve(json({ version: '1.8.0', agents: [], conversations: [], models: [] }));
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
});
