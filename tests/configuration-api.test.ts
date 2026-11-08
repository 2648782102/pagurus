import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConfigurationValidationError,
  applyConfiguration,
  getConfigurationState,
  rollbackConfiguration,
  validateConfiguration,
} from '../src/shared/api/configuration.js';

const DOCUMENT = {
  schemaVersion: 1,
  name: 'fixture',
  skills: [],
  policies: [],
  mcpServers: [],
  plugins: [],
  secretRefs: [],
  metadata: { fixture: 'one' },
};

const REVISION = {
  id: 'cfg_000000000000000000000001',
  document: DOCUMENT,
  appliedAt: '2026-11-08T00:00:00.000Z',
};

const V2_DOCUMENT = {
  ...DOCUMENT,
  schemaVersion: 2,
  name: 'composition fixture',
  composition: {
    schemaVersion: 1,
    name: 'fixture composition',
    nodes: [{ id: 'node-a', label: 'First node' }],
    links: [],
    entryNodeIds: ['node-a'],
    metadata: { shape: 'single' },
  },
};

const APPLY_RESULT = {
  changed: true,
  activeRevisionId: REVISION.id,
  revision: REVISION,
  revisions: [
    { id: REVISION.id, name: DOCUMENT.name, appliedAt: REVISION.appliedAt },
  ],
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('versioned configuration API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads and cross-checks the active revision and history', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ revision: REVISION }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));

    await expect(getConfigurationState()).resolves.toEqual({
      revision: REVISION,
      revisions: APPLY_RESULT.revisions,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/v1/configuration');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/v1/configuration/revisions');
  });

  it('rejects inconsistent active revision ids and malformed documents', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ revision: REVISION }))
      .mockResolvedValueOnce(json({ activeRevisionId: 'cfg_other', revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不一致');

    fetchMock
      .mockResolvedValueOnce(json({ revision: { ...REVISION, document: { schemaVersion: 2 } } }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不符合契约');

    fetchMock
      .mockResolvedValueOnce(json({ revision: { ...REVISION, document: { ...V2_DOCUMENT, composition: {} } } }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不符合契约');

    fetchMock
      .mockResolvedValueOnce(json({ revision: { ...REVISION, document: { ...V2_DOCUMENT, extra: true } } }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不符合契约');
  });

  it('rejects missing metadata and URL-sourced references at the client boundary', async () => {
    const withoutMetadata = { ...DOCUMENT } as Record<string, unknown>;
    delete withoutMetadata.metadata;
    fetchMock
      .mockResolvedValueOnce(json({ revision: { ...REVISION, document: withoutMetadata } }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不符合契约');

    const urlSource = {
      ...DOCUMENT,
      mcpServers: [{ id: 'remote', label: 'Remote', source: 'url' }],
    };
    fetchMock
      .mockResolvedValueOnce(json({ revision: { ...REVISION, document: urlSource } }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: APPLY_RESULT.revisions }));
    await expect(getConfigurationState()).rejects.toThrow('不符合契约');
  });

  it('validates and applies complete documents through the published POST routes', async () => {
    fetchMock.mockResolvedValueOnce(json({
      valid: true,
      activeRevisionId: REVISION.id,
      document: DOCUMENT,
    }));
    await expect(validateConfiguration(DOCUMENT)).resolves.toEqual(DOCUMENT);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/v1/configuration/validate');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('POST');

    fetchMock.mockResolvedValueOnce(json(APPLY_RESULT));
    await expect(applyConfiguration(DOCUMENT)).resolves.toEqual(APPLY_RESULT);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/v1/configuration/apply');

    fetchMock.mockResolvedValueOnce(json({
      valid: true,
      activeRevisionId: REVISION.id,
      document: V2_DOCUMENT,
    }));
    await expect(validateConfiguration(V2_DOCUMENT)).resolves.toEqual(V2_DOCUMENT);
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/v1/configuration/validate');

    fetchMock.mockResolvedValueOnce(json({
      ...APPLY_RESULT,
      revision: { ...REVISION, document: V2_DOCUMENT },
    }));
    await expect(applyConfiguration(V2_DOCUMENT)).resolves.toMatchObject({
      revision: { document: V2_DOCUMENT },
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/v1/configuration/apply');
  });

  it('rolls back with the exact rollbackTo shape', async () => {
    fetchMock.mockResolvedValueOnce(json(APPLY_RESULT));
    await expect(rollbackConfiguration(REVISION.id)).resolves.toEqual(APPLY_RESULT);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/v1/configuration/apply');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ rollbackTo: REVISION.id });
  });

  it('maps documented validation errors and connection failures', async () => {
    fetchMock.mockResolvedValueOnce(json({
      error: 'invalid',
      details: [{ path: 'name', reason: 'is required' }],
    }, 400));
    await expect(validateConfiguration({})).rejects.toMatchObject({
      name: ConfigurationValidationError.name,
      details: [{ path: 'name', reason: 'is required' }],
    });

    fetchMock.mockResolvedValueOnce(json({ error: 'missing' }, 404));
    await expect(rollbackConfiguration('cfg_missing')).rejects.toThrow('配置版本不存在');

    fetchMock.mockResolvedValueOnce(json({ error: 'offline' }, 503));
    await expect(applyConfiguration(DOCUMENT)).rejects.toThrow('未就绪');
  });
});
