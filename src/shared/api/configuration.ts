export type ConfigurationSource = 'inline' | 'file' | 'registry' | 'env';

export interface ConfigurationReference {
  id: string;
  label: string;
  source: ConfigurationSource;
}

export interface ConfigurationDocument {
  schemaVersion: 1;
  name: string;
  skills: ConfigurationReference[];
  policies: ConfigurationReference[];
  mcpServers: ConfigurationReference[];
  plugins: ConfigurationReference[];
  secretRefs: string[];
  metadata: Record<string, string>;
}

export interface ConfigurationRevision {
  id: string;
  document: ConfigurationDocument;
  appliedAt: string;
}

export interface ConfigurationRevisionSummary {
  id: string;
  name: string;
  appliedAt: string;
}

export interface ConfigurationValidationIssue {
  path: string;
  reason: string;
}

export interface ConfigurationState {
  revision: ConfigurationRevision;
  revisions: ConfigurationRevisionSummary[];
}

export interface ApplyConfigurationResult {
  changed: boolean;
  activeRevisionId: string;
  revision: ConfigurationRevision;
  revisions: ConfigurationRevisionSummary[];
}

export class ConfigurationValidationError extends Error {
  constructor(readonly details: readonly ConfigurationValidationIssue[]) {
    super('配置文档不符合 Conchbase 0.4.0 契约');
    this.name = 'ConfigurationValidationError';
  }
}

const SOURCES: readonly ConfigurationSource[] = [
  'inline',
  'file',
  'registry',
  'env',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReference(value: unknown): value is ConfigurationReference {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && SOURCES.includes(value.source as ConfigurationSource);
}

function isReferenceList(value: unknown): value is ConfigurationReference[] {
  return Array.isArray(value) && value.every(isReference);
}

function isDocument(value: unknown): value is ConfigurationDocument {
  return isRecord(value)
    && value.schemaVersion === 1
    && typeof value.name === 'string'
    && isReferenceList(value.skills)
    && isReferenceList(value.policies)
    && isReferenceList(value.mcpServers)
    && isReferenceList(value.plugins)
    && Array.isArray(value.secretRefs)
    && value.secretRefs.every((entry) => typeof entry === 'string')
    && isRecord(value.metadata)
    && Object.values(value.metadata).every((entry) => typeof entry === 'string');
}

function isRevision(value: unknown): value is ConfigurationRevision {
  return isRecord(value)
    && typeof value.id === 'string'
    && isDocument(value.document)
    && typeof value.appliedAt === 'string';
}

function isRevisionSummary(value: unknown): value is ConfigurationRevisionSummary {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.appliedAt === 'string';
}

function isValidationIssue(value: unknown): value is ConfigurationValidationIssue {
  return isRecord(value)
    && typeof value.path === 'string'
    && typeof value.reason === 'string';
}

async function request<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Accept: 'application/json',
    },
    ...(signal ? { signal } : {}),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 400 && isRecord(payload) && Array.isArray(payload.details)) {
      const details = payload.details.filter(isValidationIssue);
      if (details.length > 0) throw new ConfigurationValidationError(details);
    }
    if (response.status === 404) throw new Error('配置版本不存在');
    if (response.status === 503) throw new Error('Runtime 配置服务未就绪');
    throw new Error(`Runtime 返回 HTTP ${response.status}`);
  }
  if (!isPayload(payload)) {
    throw new Error(`Runtime 返回了不符合契约的数据：${path}`);
  }
  return payload;
}

function postJson(body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  };
}

export async function getConfigurationState(signal?: AbortSignal): Promise<ConfigurationState> {
  const isEnvelope = (value: unknown): value is { revision: ConfigurationRevision } =>
    isRecord(value) && isRevision(value.revision);
  const isList = (value: unknown): value is {
    activeRevisionId: string;
    revisions: ConfigurationRevisionSummary[];
  } => isRecord(value)
    && typeof value.activeRevisionId === 'string'
    && Array.isArray(value.revisions)
    && value.revisions.every(isRevisionSummary);
  const [active, history] = await Promise.all([
    request('/v1/configuration', isEnvelope, { signal }, signal),
    request('/v1/configuration/revisions', isList, { signal }, signal),
  ]);
  if (active.revision.id !== history.activeRevisionId) {
    throw new Error('Runtime 返回了不一致的配置版本');
  }
  return { revision: active.revision, revisions: history.revisions };
}

export async function validateConfiguration(
  document: unknown,
  signal?: AbortSignal,
): Promise<ConfigurationDocument> {
  const isPayload = (value: unknown): value is {
    valid: true;
    activeRevisionId: string;
    document: ConfigurationDocument;
  } => isRecord(value)
    && value.valid === true
    && typeof value.activeRevisionId === 'string'
    && isDocument(value.document);
  const result = await request(
    '/v1/configuration/validate',
    isPayload,
    postJson({ document }, signal),
    signal,
  );
  return result.document;
}

export function applyConfiguration(
  document: unknown,
  signal?: AbortSignal,
): Promise<ApplyConfigurationResult> {
  return request(
    '/v1/configuration/apply',
    isApplyResult,
    postJson({ document }, signal),
    signal,
  );
}

export function rollbackConfiguration(
  revisionId: string,
  signal?: AbortSignal,
): Promise<ApplyConfigurationResult> {
  return request(
    '/v1/configuration/apply',
    isApplyResult,
    postJson({ rollbackTo: revisionId }, signal),
    signal,
  );
}

function isApplyResult(value: unknown): value is ApplyConfigurationResult {
  return isRecord(value)
    && typeof value.changed === 'boolean'
    && typeof value.activeRevisionId === 'string'
    && isRevision(value.revision)
    && Array.isArray(value.revisions)
    && value.revisions.every(isRevisionSummary);
}
