import { hasOnlyKeys, isRecord } from './guards.js';
import { fromRequestInit, requestJson } from './http.js';

export type ConfigurationSource = 'inline' | 'file' | 'registry' | 'env';

export interface ConfigurationReference {
  id: string;
  label: string;
  source: ConfigurationSource;
}

interface ConfigurationDocumentBase {
  name: string;
  skills: ConfigurationReference[];
  policies: ConfigurationReference[];
  mcpServers: ConfigurationReference[];
  plugins: ConfigurationReference[];
  secretRefs: string[];
  metadata: Record<string, string>;
}

export interface ConfigurationDocumentV1 extends ConfigurationDocumentBase {
  schemaVersion: 1;
}

export interface CompositionNode {
  id: string;
  label: string;
}

export interface CompositionLink {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface ConfigurationComposition {
  schemaVersion: 1;
  name: string;
  nodes: CompositionNode[];
  links: CompositionLink[];
  entryNodeIds: string[];
  metadata: Record<string, string>;
}

export interface ConfigurationDocumentV2 extends ConfigurationDocumentBase {
  schemaVersion: 2;
  composition: ConfigurationComposition;
}

export type ConfigurationDocument = ConfigurationDocumentV1 | ConfigurationDocumentV2;

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
    super('配置文档不符合 Conchbase 0.5.0+ 契约');
    this.name = 'ConfigurationValidationError';
  }
}

const SOURCES: readonly ConfigurationSource[] = [
  'inline',
  'file',
  'registry',
  'env',
];
const BASE_KEYS = [
  'schemaVersion',
  'name',
  'skills',
  'policies',
  'mcpServers',
  'plugins',
  'secretRefs',
  'metadata',
];
const V2_KEYS = [...BASE_KEYS, 'composition'];
const COMPOSITION_KEYS = [
  'schemaVersion',
  'name',
  'nodes',
  'links',
  'entryNodeIds',
  'metadata',
];

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

function isMetadata(value: unknown): value is Record<string, string> {
  return isRecord(value)
    && Object.values(value).every((entry) => typeof entry === 'string');
}

function isNodeList(value: unknown): value is CompositionNode[] {
  return Array.isArray(value)
    && value.every((entry) => isRecord(entry)
      && hasOnlyKeys(entry, ['id', 'label'])
      && isBoundedString(entry.id)
      && isBoundedString(entry.label));
}

function isLinkList(value: unknown): value is CompositionLink[] {
  return Array.isArray(value)
    && value.every((entry) => isRecord(entry)
      && hasOnlyKeys(entry, ['id', 'from', 'to', 'label'])
      && isBoundedString(entry.id)
      && isBoundedString(entry.from)
      && isBoundedString(entry.to)
      && isBoundedString(entry.label));
}

function isNodeIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isBoundedString);
}

function isComposition(value: unknown): value is ConfigurationComposition {
  return isRecord(value)
    && hasOnlyKeys(value, COMPOSITION_KEYS)
    && value.schemaVersion === 1
    && isBoundedString(value.name)
    && isNodeList(value.nodes)
    && isLinkList(value.links)
    && isNodeIdList(value.entryNodeIds)
    && isMetadata(value.metadata);
}

function isBaseDocument(value: Record<string, unknown>): boolean {
  return isBoundedString(value.name)
    && isReferenceList(value.skills)
    && isReferenceList(value.policies)
    && isReferenceList(value.mcpServers)
    && isReferenceList(value.plugins)
    && Array.isArray(value.secretRefs)
    && value.secretRefs.every((entry) => typeof entry === 'string')
    && isMetadata(value.metadata);
}

function isDocument(value: unknown): value is ConfigurationDocument {
  if (!isRecord(value)) return false;
  if (value.schemaVersion === 1) {
    return hasOnlyKeys(value, BASE_KEYS) && isBaseDocument(value);
  }
  if (value.schemaVersion === 2) {
    return hasOnlyKeys(value, V2_KEYS)
      && isBaseDocument(value)
      && isComposition(value.composition);
  }
  return false;
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

function configurationHttpError(status: number, payload: unknown): Error | undefined {
  if (status === 400 && isRecord(payload) && Array.isArray(payload.details)) {
    const details = payload.details.filter(isValidationIssue);
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

