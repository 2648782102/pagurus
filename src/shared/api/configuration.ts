import { isRecord } from './guards.js';
import { fromRequestInit, requestJson } from './http.js';
import {
  ConfigurationValidationError,
  isConfigurationApplyResult,
  isConfigurationDocument,
  isConfigurationRevision,
  isConfigurationRevisionSummary,
  isConfigurationValidationIssue,
  type ApplyConfigurationResult,
  type ConfigurationDocument,
  type ConfigurationRevision,
  type ConfigurationRevisionSummary,
  type ConfigurationState,
} from './configuration-contract.js';

export * from './configuration-contract.js';

function configurationHttpError(status: number, payload: unknown): Error | undefined {
  if (status === 400 && isRecord(payload) && Array.isArray(payload.details)) {
    const details = payload.details.filter(isConfigurationValidationIssue);
    if (details.length > 0) return new ConfigurationValidationError(details);
  }
  if (status === 404) return new Error('配置版本不存在');
  if (status === 503) return new Error('Runtime 配置服务未就绪');
  return undefined;
}

function request<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  return requestJson(path, isPayload, {
    ...fromRequestInit(init, signal),
    // The configuration contract sends a JSON body on every request, including
    // reads, because the legacy client always advertised a JSON content type.
    jsonContentType: true,
    httpError: configurationHttpError,
    fallbackError: (status) => new Error(`Runtime 返回 HTTP ${status}`),
    invalidPayload: (failedPath) => new Error(`Runtime 返回了不符合契约的数据：${failedPath}`),
  });
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
    isRecord(value) && isConfigurationRevision(value.revision);
  const isList = (value: unknown): value is {
    activeRevisionId: string;
    revisions: ConfigurationRevisionSummary[];
  } => isRecord(value)
    && typeof value.activeRevisionId === 'string'
    && Array.isArray(value.revisions)
    && value.revisions.every(isConfigurationRevisionSummary);
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
    && isConfigurationDocument(value.document);
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
    isConfigurationApplyResult,
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
    isConfigurationApplyResult,
    postJson({ rollbackTo: revisionId }, signal),
    signal,
  );
}


