import { useCallback, useEffect, useState } from 'react';
import {
  createExecutionGrant,
  createExecutionRequest,
  decideExecutionRequest,
  getExecutionEvents,
  listExecutionCapabilities,
  listExecutionGrants,
  revokeExecutionGrant,
  supportsExecutionContract,
  type ExecutionCapability,
  type ExecutionEvent,
  type ExecutionGrant,
  type ExecutionRequest,
} from '../../shared/api/execution.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

export type ExecutionConsolePhase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

export interface ExecutionConsoleState {
  readonly phase: ExecutionConsolePhase;
  readonly capabilities: readonly ExecutionCapability[];
  readonly grants: readonly ExecutionGrant[];
  readonly requests: readonly ExecutionRequest[];
  readonly events: readonly ExecutionEvent[];
  readonly selectedCapabilityId: string;
  readonly operation: string;
  readonly message: string | null;
  readonly error: string | null;
  readonly busy: boolean;
}

const initialState: ExecutionConsoleState = {
  phase: 'checking',
  capabilities: [],
  grants: [],
  requests: [],
  events: [],
  selectedCapabilityId: '',
  operation: 'observe',
  message: null,
  error: null,
  busy: false,
};

const fixtureDigest = `sha256:${'a'.repeat(64)}`;
const fakeDestinationDigest = 'sha256:5171f8f3e1172a39059a36998e84b69b57553e0645fe8d34660f7b2347ac6e82';

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : '受控执行状态读取失败';
}

export function useExecutionConsole(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<ExecutionConsoleState>(initialState);
  const supported = supportsExecutionContract(runtime);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!runtime) {
      setState((value) => ({ ...value, phase: 'checking', error: null }));
      return;
    }
    if (!supported) {
      setState((value) => ({ ...value, phase: 'unsupported', error: null }));
      return;
    }
    setState((value) => ({ ...value, phase: 'loading', error: null }));
    try {
      const [capabilities, grants, events] = await Promise.all([
        listExecutionCapabilities(signal),
        listExecutionGrants(signal),
        getExecutionEvents(undefined, 100, signal),
      ]);
      if (signal?.aborted) return;
      setState((value) => ({
        ...value,
        phase: 'ready',
        capabilities: capabilities.capabilities,
        grants: grants.grants,
        events: events.events,
        selectedCapabilityId: value.selectedCapabilityId || capabilities.capabilities[0]?.id || '',
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((value) => ({ ...value, phase: 'error', error: errorText(cause) }));
    }
  }, [runtime, supported]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const createGrant = useCallback(async () => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      const capability = state.capabilities.find((item) => item.id === state.selectedCapabilityId)
        ?? state.capabilities[0];
      if (!capability) throw new Error('Runtime 尚未发布能力。');
      const result = await createExecutionGrant({
        capabilityId: capability.id,
        agentId: 'agt_console_demo',
        agentRevisionId: 'agr_console_demo',
        configurationRevisionId: 'cfg_console_demo',
        delegationId: 'del_console_demo',
        projectId: 'project_console_demo',
        workItemId: 'work_console_demo',
        assignmentId: 'asg_console_demo',
        operation: state.operation,
        destinationDigest: capability.id === 'cap_fake_observe' ? fakeDestinationDigest : capability.destinationDigest,
        scope: ['project:console-demo'],
        capabilities: ['cap_read_context'],
        expiresAtSequence: 100,
      });
      setState((value) => ({
        ...value,
        busy: false,
        message: `授权已创建（${result.grant.id}）。能力记录本身仍不等于执行。`,
      }));
      await load();
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load, state.capabilities, state.operation, state.selectedCapabilityId]);

  const revokeGrant = useCallback(async (grant: ExecutionGrant) => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      await revokeExecutionGrant(grant.id, grant.expectedVersion);
      setState((value) => ({ ...value, busy: false, message: '授权已撤销。' }));
      await load();
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  const createRequest = useCallback(async (grant: ExecutionGrant) => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      const result = await createExecutionRequest({
        grantId: grant.id,
        expectedGrantVersion: grant.expectedVersion,
        operation: grant.operation,
        argumentsDigest: fixtureDigest,
        idempotencyKey: `pagurus-exec-${globalThis.crypto.randomUUID()}`,
      });
      setState((value) => ({
        ...value,
        busy: false,
        requests: [...value.requests.filter((item) => item.id !== result.request.id), result.request],
        message: '执行请求已创建，等待显式审批。',
      }));
      await load();
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  const decideRequest = useCallback(async (
    request: ExecutionRequest,
    decision: 'approved' | 'rejected',
  ) => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      const result = await decideExecutionRequest(
        request.id,
        request.expectedVersion,
        decision,
        fixtureDigest,
      );
      setState((value) => ({
        ...value,
        busy: false,
        requests: [...value.requests.filter((item) => item.id !== result.request.id), result.request],
        message: decision === 'approved' ? '请求已批准并完成假执行。' : '请求已拒绝；未执行。',
      }));
      await load();
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  return {
    ...state,
    supported,
    selectCapability: (selectedCapabilityId: string) => setState((value) => ({ ...value, selectedCapabilityId })),
    setOperation: (operation: string) => setState((value) => ({ ...value, operation })),
    createGrant: () => void createGrant(),
    revokeGrant: (grant: ExecutionGrant) => void revokeGrant(grant),
    createRequest: (grant: ExecutionGrant) => void createRequest(grant),
    approveRequest: (request: ExecutionRequest) => void decideRequest(request, 'approved'),
    rejectRequest: (request: ExecutionRequest) => void decideRequest(request, 'rejected'),
    load: () => void load(),
  };
}
