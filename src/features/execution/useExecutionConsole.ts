import { useCallback, useEffect, useState } from 'react';
import {
  createExecutionGrant,
  createExecutionRequest,
  decideExecutionRequest,
  revokeExecutionGrant,
  supportsExecutionContract,
  type ExecutionGrant,
  type ExecutionRequest,
} from '../../shared/api/execution.js';
import {
  cancelExecutionRun,
  createExecutionRun,
  recoverExecutionRun,
  startExecutionRun,
  supportsExecutionRunContract,
  type ExecutionRun,
} from '../../shared/api/execution-runs.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { errorMessage } from '../../shared/ui/errors.js';
import {
  initialExecutionConsoleState as initialState,
  loadExecutionSnapshot,
  type ExecutionConsoleState,
} from './execution-data.js';

export type { ExecutionConsolePhase, ExecutionConsoleState } from './execution-data.js';

const fixtureDigest = `sha256:${'a'.repeat(64)}`;
const fakeDestinationDigest = 'sha256:5171f8f3e1172a39059a36998e84b69b57553e0645fe8d34660f7b2347ac6e82';

function errorText(cause: unknown): string {
  return errorMessage(cause, '受控执行状态读取失败');
}

export function useExecutionConsole(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<ExecutionConsoleState>(initialState);
  const supported = supportsExecutionContract(runtime);
  const runsSupported = supportsExecutionRunContract(runtime);

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
      const snapshot = await loadExecutionSnapshot(runsSupported, signal);
      if (signal?.aborted) return;
      setState((value) => ({
        ...value,
        phase: 'ready',
        ...snapshot,
        selectedCapabilityId: value.selectedCapabilityId || snapshot.capabilities[0]?.id || '',
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((value) => ({ ...value, phase: 'error', error: errorText(cause) }));
    }
  }, [runtime, runsSupported, supported]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * One write path: mark busy, run, set the success message and refresh, or
   * surface the error with busy cleared. Every action below differs only in the
   * request it sends and the sentence it reports.
   */
  const runAction = useCallback(async (action: () => Promise<string>) => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      const message = await action();
      setState((value) => ({ ...value, busy: false, message }));
      await load();
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  /** Requests and runs have no published list route, so a refresh keeps them. */
  const replaceRequest = useCallback((request: ExecutionRequest) => {
    setState((value) => ({
      ...value,
      requests: [...value.requests.filter((item) => item.id !== request.id), request],
    }));
  }, []);

  const replaceRun = useCallback((run: ExecutionRun) => {
    setState((value) => ({
      ...value,
      runs: [...value.runs.filter((item) => item.id !== run.id), run],
    }));
  }, []);

  const createGrant = useCallback(async () => {
    await runAction(async () => {
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
      return `授权已创建（${result.grant.id}）。能力记录本身仍不等于执行。`;
    });
  }, [runAction, state.capabilities, state.operation, state.selectedCapabilityId]);

  const revokeGrant = useCallback(async (grant: ExecutionGrant) => {
    await runAction(async () => {
      await revokeExecutionGrant(grant.id, grant.expectedVersion);
      return '授权已撤销。';
    });
  }, [runAction]);

  const createRequest = useCallback(async (grant: ExecutionGrant) => {
    await runAction(async () => {
      const result = await createExecutionRequest({
        grantId: grant.id,
        expectedGrantVersion: grant.expectedVersion,
        operation: grant.operation,
        argumentsDigest: fixtureDigest,
        idempotencyKey: `pagurus-exec-${globalThis.crypto.randomUUID()}`,
      });
      replaceRequest(result.request);
      return '执行请求已创建，等待显式审批。';
    });
  }, [replaceRequest, runAction]);

  const decideRequest = useCallback(async (
    request: ExecutionRequest,
    decision: 'approved' | 'rejected',
  ) => {
    await runAction(async () => {
      const result = await decideExecutionRequest(
        request.id,
        request.expectedVersion,
        decision,
        fixtureDigest,
      );
      replaceRequest(result.request);
      return decision === 'approved' ? '请求已批准并完成假执行。' : '请求已拒绝；未执行。';
    });
  }, [replaceRequest, runAction]);

  const createRun = useCallback(async (request: ExecutionRequest) => {
    await runAction(async () => {
      const grant = state.grants.find((item) => item.id === request.grantId);
      const adapter = state.adapters[0];
      if (!grant || !adapter) throw new Error('Runtime 尚未发布授权或执行适配器。');
      const result = await createExecutionRun({
        requestId: request.id,
        expectedRequestVersion: request.expectedVersion,
        grantId: grant.id,
        operation: request.operation,
        argumentsDigest: request.argumentsDigest,
        adapterId: adapter.id,
        idempotencyKey: `pagurus-run-${globalThis.crypto.randomUUID()}`,
      });
      replaceRun(result.run);
      return `隔离执行 run 已创建（${result.run.id}）。`;
    });
  }, [replaceRun, runAction, state.adapters, state.grants]);

  const transitionRun = useCallback(async (
    run: ExecutionRun,
    action: 'start' | 'recover',
  ) => {
    await runAction(async () => {
      const result = action === 'start'
        ? await startExecutionRun(run.id, run.expectedVersion)
        : await recoverExecutionRun(run.id, run.expectedVersion);
      replaceRun(result.run);
      return action === 'start' ? '隔离执行已启动。' : '隔离执行已恢复到可启动状态。';
    });
  }, [replaceRun, runAction]);

  const cancelRun = useCallback(async (run: ExecutionRun) => {
    await runAction(async () => {
      const result = await cancelExecutionRun(run.id, run.expectedVersion);
      replaceRun(result.run);
      return '隔离执行 run 已取消。';
    });
  }, [replaceRun, runAction]);

  return {
    ...state,
    supported,
    runsSupported,
    selectCapability: (selectedCapabilityId: string) => setState((value) => ({ ...value, selectedCapabilityId })),
    setOperation: (operation: string) => setState((value) => ({ ...value, operation })),
    createGrant: () => void createGrant(),
    revokeGrant: (grant: ExecutionGrant) => void revokeGrant(grant),
    createRequest: (grant: ExecutionGrant) => void createRequest(grant),
    approveRequest: (request: ExecutionRequest) => void decideRequest(request, 'approved'),
    rejectRequest: (request: ExecutionRequest) => void decideRequest(request, 'rejected'),
    createRun: (request: ExecutionRequest) => void createRun(request),
    startRun: (run: ExecutionRun) => void transitionRun(run, 'start'),
    recoverRun: (run: ExecutionRun) => void transitionRun(run, 'recover'),
    cancelRun: (run: ExecutionRun) => void cancelRun(run),
    load: () => void load(),
  };
}
