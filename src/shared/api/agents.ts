import { hasRuntimeCapability, getRuntimeInfo, type RuntimeInfo } from './runtime.js';
import { isRecord } from './guards.js';
import { jsonBody, requestJson } from './http.js';

export interface ModelReference {
  providerId: string;
  modelId: string;
}

export interface ProviderModel extends ModelReference {
  reference: string;
  displayName: string;
  capabilities: string[];
}

export type CapabilityGrantKind = 'tool' | 'skill';

export interface CapabilityGrant {
  kind: CapabilityGrantKind;
  name: string;
}

export interface AgentRevision extends ModelReference {
  id: string;
  name: string;
  instructions: string;
  grantedCapabilities: CapabilityGrant[];
  createdAt: string;
}

export interface AgentRecord {
  id: string;
  currentRevisionId: string;
  archived: boolean;
  isDefault: boolean;
  current: AgentRevision;
}

export interface Agent extends AgentRecord {
  revisions: AgentRevision[];
}

export interface AgentProfile extends ModelReference {
  name: string;
  instructions: string;
  grantedCapabilities?: CapabilityGrant[];
}

export interface AgentTaskBinding {
  agentId: string;
  agentRevisionId: string;
  providerId: string;
  modelId: string;
}

function isModelReference(value: unknown): value is ModelReference {
  return isRecord(value)
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string';
}

function isAgentRevision(value: unknown): value is AgentRevision {
  if (!isRecord(value)) return false;
  return isModelReference(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.instructions === 'string'
    && (value.grantedCapabilities === undefined || isCapabilityGrants(value.grantedCapabilities))
    && typeof value.createdAt === 'string';
}

export function isCapabilityGrant(value: unknown): value is CapabilityGrant {
  return isRecord(value)
    && (value.kind === 'tool' || value.kind === 'skill')
    && typeof value.name === 'string';
}

export function isCapabilityGrants(value: unknown): value is CapabilityGrant[] {
  return Array.isArray(value) && value.every(isCapabilityGrant);
}

function isAgentRecord(value: unknown): value is AgentRecord {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.currentRevisionId === 'string'
    && typeof value.archived === 'boolean'
    && typeof value.isDefault === 'boolean'
    && isAgentRevision(value.current);
}

function isAgent(value: unknown): value is Agent {
  if (!isRecord(value) || !isAgentRecord(value)) return false;
  return Array.isArray(value.revisions) && value.revisions.every(isAgentRevision);
}

function isAgentList(value: unknown): value is { agents: AgentRecord[] } {
  return isRecord(value) && Array.isArray(value.agents) && value.agents.every(isAgentRecord);
}

function isAgentEnvelope(value: unknown): value is { agent: Agent } {
  return isRecord(value) && isAgent(value.agent);
}

function isAgentRecordEnvelope(value: unknown): value is { agent: AgentRecord } {
  return isRecord(value) && isAgentRecord(value.agent);
}

function isDefaultAgentEnvelope(value: unknown): value is { agent: AgentRecord | null } {
  return isRecord(value) && (value.agent === null || isAgentRecord(value.agent));
}

function isProviderModelCatalog(value: unknown): value is { models: ProviderModel[] } {
  if (!isRecord(value) || !Array.isArray(value.models)) return false;
  return value.models.every((entry) => isModelReference(entry)
    && isRecord(entry)
    && typeof entry.reference === 'string'
    && typeof entry.displayName === 'string'
    && Array.isArray(entry.capabilities)
    && entry.capabilities.every((capability) => typeof capability === 'string'));
}

function agentHttpError(status: number): Error | undefined {
  if (status === 400) return new Error('请求不符合 Agent Runtime API 契约');
  if (status === 404) return new Error('Agent 或模型不存在');
  if (status === 409) return new Error('Agent 已被其他操作更新，请重新加载后再编辑');
  if (status === 502) return new Error('模型目录暂不可用');
  if (status === 503) return new Error('Runtime Agent 服务未就绪');
  return undefined;
}

function request<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson(path, isPayload, {
    ...(method === 'GET' ? {} : { method }),
    ...(body === undefined ? {} : { body: jsonBody(body) }),
    signal,
    httpError: agentHttpError,
    fallbackError: (status) => new Error(`Runtime 返回 HTTP ${status}`),
    invalidPayload: (failedPath) => new Error(`Runtime 返回了不符合契约的数据：${failedPath}`),
  });
}

export async function supportsAgentManagement(signal?: AbortSignal): Promise<boolean> {
  const runtime = await getRuntimeInfo(signal);
  return hasRuntimeCapability(runtime, 'agents')
    && hasRuntimeCapability(runtime, 'provider-neutral-model-catalog');
}

export async function listAgents(signal?: AbortSignal): Promise<AgentRecord[]> {
  return (await request('/v1/agents', isAgentList, 'GET', undefined, signal)).agents;
}

export async function getAgent(agentId: string, signal?: AbortSignal): Promise<Agent> {
  return (await request(`/v1/agents/${encodeURIComponent(agentId)}`, isAgentEnvelope, 'GET', undefined, signal)).agent;
}

export async function listProviderModels(signal?: AbortSignal): Promise<ProviderModel[]> {
  return (await request('/v1/model-catalog', isProviderModelCatalog, 'GET', undefined, signal)).models;
}

export async function getDefaultAgent(signal?: AbortSignal): Promise<AgentRecord | null> {
  return (await request('/v1/agents/default', isDefaultAgentEnvelope, 'GET', undefined, signal)).agent;
}

export async function createAgent(profile: AgentProfile, signal?: AbortSignal): Promise<Agent> {
  return (await request('/v1/agents', isAgentEnvelope, 'POST', profile, signal)).agent;
}

export async function updateAgent(
  agentId: string,
  expectedRevisionId: string,
  profile: AgentProfile,
  signal?: AbortSignal,
): Promise<Agent> {
  return (await request(`/v1/agents/${encodeURIComponent(agentId)}`, isAgentEnvelope, 'PATCH', {
    expectedRevisionId,
    profile,
  }, signal)).agent;
}

export async function duplicateAgent(
  agentId: string,
  revisionId?: string,
  signal?: AbortSignal,
): Promise<Agent> {
  return (await request(`/v1/agents/${encodeURIComponent(agentId)}/duplicate`, isAgentEnvelope, 'POST',
    revisionId === undefined ? {} : { revisionId }, signal)).agent;
}

export async function archiveAgent(agentId: string, signal?: AbortSignal): Promise<AgentRecord> {
  return (await request(`/v1/agents/${encodeURIComponent(agentId)}/archive`, isAgentRecordEnvelope, 'POST', undefined, signal)).agent;
}

export async function setDefaultAgent(agentId: string | null, signal?: AbortSignal): Promise<AgentRecord | null> {
  return (await request('/v1/agents/default', isDefaultAgentEnvelope, 'PUT', { agentId }, signal)).agent;
}

export async function applyAgentRevision(
  agentId: string,
  revisionId: string,
  expectedRevisionId: string,
  signal?: AbortSignal,
): Promise<Agent> {
  return (await request(`/v1/agents/${encodeURIComponent(agentId)}/revisions/apply`, isAgentEnvelope, 'POST', {
    revisionId,
    expectedRevisionId,
  }, signal)).agent;
}

export type { RuntimeInfo };

export interface CapabilityAuditGrant {
  kind: CapabilityGrantKind;
  name: string;
  stillAvailable: boolean;
}

export interface CapabilityAudit {
  version: 1;
  agents: {
    agentId: string;
    currentRevisionId: string;
    archived: boolean;
    grants: CapabilityAuditGrant[];
  }[];
  staleGrants: {
    agentId: string;
    revisionId: string;
    kind: CapabilityGrantKind;
    name: string;
  }[];
  available?: { tools: string[]; skills: string[] };
}

function isCapabilityAudit(value: unknown): value is CapabilityAudit {
  return isRecord(value) && value.version === 1
    && Array.isArray(value.agents) && Array.isArray(value.staleGrants)
    && (value.available === undefined || (isRecord(value.available)
      && Array.isArray(value.available.tools) && Array.isArray(value.available.skills)));
}

export async function getCapabilityAudit(signal?: AbortSignal): Promise<CapabilityAudit> {
  return request('/v1/agents/capability-grants', isCapabilityAudit, 'GET', undefined, signal);
}
