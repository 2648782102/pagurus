import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeHealth, getRuntimeInfo } from '../src/shared/api/runtime.js';

describe('getRuntimeHealth', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a health payload that matches the versioned contract', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      service: 'conchbase',
      apiVersion: 1,
    }), { status: 200 }));

    await expect(getRuntimeHealth()).resolves.toEqual({
      status: 'ok',
      service: 'conchbase',
      apiVersion: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith('/v1/health', {
      headers: { Accept: 'application/json' },
      signal: undefined,
    });
  });

  it('reports HTTP errors without attempting to parse an error body', async () => {
    fetchMock.mockResolvedValue(new Response('unavailable', { status: 503 }));

    await expect(getRuntimeHealth()).rejects.toThrow('Runtime returned HTTP 503');
  });

  it('rejects payloads that do not match the current API contract', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      service: 'conchbase',
      apiVersion: 2,
    }), { status: 200 }));

    await expect(getRuntimeHealth()).rejects.toThrow('invalid response from /v1/health');
  });

  it('validates runtime identity and capability data', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      name: 'Conchbase',
      version: '0.1.0',
      state: 'ready',
      capabilities: [],
    }), { status: 200 }));

    await expect(getRuntimeInfo()).resolves.toEqual({
      name: 'Conchbase',
      version: '0.1.0',
      state: 'ready',
      capabilities: [],
    });
    expect(fetchMock).toHaveBeenCalledWith('/v1/runtime', {
      headers: { Accept: 'application/json' },
      signal: undefined,
    });
  });

  it('rejects runtime capabilities with invalid types', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      name: 'Conchbase',
      version: '0.1.0',
      state: 'ready',
      capabilities: [42],
    }), { status: 200 }));

    await expect(getRuntimeInfo()).rejects.toThrow('invalid response from /v1/runtime');
  });
});
