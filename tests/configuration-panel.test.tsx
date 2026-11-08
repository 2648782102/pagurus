// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationPanel } from '../src/features/configuration/ConfigurationPanel.js';

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

const HISTORY = [
  { id: REVISION.id, name: 'fixture', appliedAt: REVISION.appliedAt },
  { id: 'cfg_000000000000000000000000', name: 'bootstrap', appliedAt: '2026-11-07T00:00:00.000Z' },
];

const APPLY_RESULT = {
  changed: true,
  activeRevisionId: REVISION.id,
  revision: REVISION,
  revisions: HISTORY,
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

function runtimeResponse(
  version = '0.5.0',
  capabilities = ['configuration-revisions', 'composition-execution'],
): Response {
  return json({
    name: 'Conchbase',
    version,
    state: 'ready',
    capabilities,
  });
}

function connectedResponses(): Response[] {
  return [
    runtimeResponse(),
    json({ revision: REVISION }),
    json({ activeRevisionId: REVISION.id, revisions: HISTORY }),
  ];
}

describe('ConfigurationPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads the active revision and revision history', async () => {
    fetchMock.mockImplementationOnce(async () => connectedResponses()[0]!)
      .mockImplementationOnce(async () => connectedResponses()[1]!)
      .mockImplementationOnce(async () => connectedResponses()[2]!);

    render(<ConfigurationPanel />);
    expect(await screen.findByText(REVISION.id)).toBeTruthy();
    expect(screen.getByLabelText('配置文档 JSON')).toHaveProperty('value');
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByRole('button', { name: '校验并应用' })).toBeTruthy();
  });

  it('shows an explicit unsupported-runtime state without editing', async () => {
    fetchMock.mockResolvedValueOnce(runtimeResponse('0.3.0', []));
    render(<ConfigurationPanel />);
    expect(await screen.findByText(/未提供配置版本能力/)).toBeTruthy();
    expect((screen.getByLabelText('配置文档 JSON') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('shows field-level validation issues without applying a document', async () => {
    for (const response of connectedResponses()) fetchMock.mockResolvedValueOnce(response);
    fetchMock.mockResolvedValueOnce(json({
      error: 'invalid',
      details: [{ path: 'schemaVersion', reason: 'must be 1' }],
    }, 400));

    render(<ConfigurationPanel />);
    await screen.findByText(REVISION.id);
    fireEvent.change(screen.getByLabelText('配置文档 JSON'), {
      target: { value: JSON.stringify({ ...DOCUMENT, schemaVersion: 4 }) },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用' }));

    expect(await screen.findByText(/配置校验未通过/)).toBeTruthy();
    expect(screen.getByRole('list', { name: '配置校验问题' }).textContent).toContain('schemaVersion');
    expect(fetchMock.mock.calls.some((call) => call[0] === '/v1/configuration/apply')).toBe(false);
  });

  it('validates, applies, and reports a no-op revision', async () => {
    for (const response of connectedResponses()) fetchMock.mockResolvedValueOnce(response);
    fetchMock
      .mockResolvedValueOnce(json({ valid: true, activeRevisionId: REVISION.id, document: DOCUMENT }))
      .mockResolvedValueOnce(json({ ...APPLY_RESULT, changed: false }));

    render(<ConfigurationPanel />);
    await screen.findByText(REVISION.id);
    fireEvent.click(screen.getByRole('button', { name: '校验并应用' }));

    expect(await screen.findByText(/没有创建新版本/)).toBeTruthy();
    const applyCall = fetchMock.mock.calls.find((call) => call[0] === '/v1/configuration/apply');
    expect(applyCall).toBeTruthy();
    expect(JSON.parse(String((applyCall?.[1] as RequestInit).body))).toEqual({ document: DOCUMENT });
  });

  it('validates and applies a v2 composition document without a visual builder', async () => {
    const v2Document = {
      ...DOCUMENT,
      schemaVersion: 2,
      composition: {
        schemaVersion: 1,
        name: 'fixture composition',
        nodes: [{ id: 'node-a', label: 'First node' }],
        links: [],
        entryNodeIds: ['node-a'],
        metadata: { shape: 'single' },
      },
    };
    for (const response of connectedResponses()) fetchMock.mockResolvedValueOnce(response);
    fetchMock
      .mockResolvedValueOnce(json({
        valid: true,
        activeRevisionId: REVISION.id,
        document: v2Document,
      }))
      .mockResolvedValueOnce(json({
        ...APPLY_RESULT,
        revision: { ...REVISION, document: v2Document },
      }));

    render(<ConfigurationPanel />);
    await screen.findByText(REVISION.id);
    fireEvent.change(screen.getByLabelText('配置文档 JSON'), {
      target: { value: JSON.stringify(v2Document) },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用' }));

    expect(await screen.findByText(/已应用新的配置版本/)).toBeTruthy();
    expect(screen.queryByLabelText('可视化组合编辑器')).toBeNull();
    const applyCall = fetchMock.mock.calls.find((call) => call[0] === '/v1/configuration/apply');
    expect(JSON.parse(String((applyCall?.[1] as RequestInit).body))).toEqual({ document: v2Document });
  });

  it('explains that v2 requires composition-execution on an older runtime', async () => {
    fetchMock.mockResolvedValueOnce(runtimeResponse('0.4.0', ['configuration-revisions']))
      .mockResolvedValueOnce(json({ revision: REVISION }))
      .mockResolvedValueOnce(json({ activeRevisionId: REVISION.id, revisions: HISTORY }));
    const v2Document = {
      ...DOCUMENT,
      schemaVersion: 2,
      composition: {
        schemaVersion: 1,
        name: 'fixture composition',
        nodes: [{ id: 'node-a', label: 'First node' }],
        links: [],
        entryNodeIds: ['node-a'],
        metadata: { shape: 'single' },
      },
    };

    render(<ConfigurationPanel />);
    await screen.findByText(REVISION.id);
    fireEvent.change(screen.getByLabelText('配置文档 JSON'), {
      target: { value: JSON.stringify(v2Document) },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用' }));

    expect(await screen.findByText(/当前 Conchbase 未提供 composition-execution 能力/)).toBeTruthy();
    expect(fetchMock.mock.calls.some((call) => call[0] === '/v1/configuration/apply')).toBe(false);
  });

  it('rolls back through a keyboard-accessible select and button', async () => {
    for (const response of connectedResponses()) fetchMock.mockResolvedValueOnce(response);
    fetchMock.mockResolvedValueOnce(json(APPLY_RESULT));

    render(<ConfigurationPanel />);
    await screen.findByText(REVISION.id);
    fireEvent.change(screen.getByLabelText('切换到历史版本'), {
      target: { value: HISTORY[1]!.id },
    });
    fireEvent.click(screen.getByRole('button', { name: '回滚到所选版本' }));

    await waitFor(() => expect(screen.getByText(/已切换到所选配置版本/)).toBeTruthy());
    const rollbackCall = fetchMock.mock.calls.find((call) => call[0] === '/v1/configuration/apply');
    expect(JSON.parse(String((rollbackCall?.[1] as RequestInit).body))).toEqual({
      rollbackTo: HISTORY[1]!.id,
    });
  });

  it('offers a recoverable disconnected state', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'offline' }, 503));
    render(<ConfigurationPanel />);
    expect(await screen.findByRole('button', { name: '重新加载配置' })).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
