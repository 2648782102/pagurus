import {
  getExecutionEvents,
  listExecutionCapabilities,
  listExecutionGrants,
  type ExecutionCapability,
  type ExecutionEvent,
  type ExecutionGrant,
  type ExecutionRequest,
} from '../../shared/api/execution.js';
import {
  getExecutionRunEvents,
  listExecutionAdapters,
  listExecutionRuns,
  type ExecutionAdapter,
  type ExecutionRun,
  type ExecutionRunEvent,
} from '../../shared/api/execution-runs.js';

export type ExecutionConsolePhase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

export interface ExecutionConsoleState {
  readonly phase: ExecutionConsolePhase;
  readonly capabilities: readonly ExecutionCapability[];
  readonly grants: readonly ExecutionGrant[];
  readonly requests: readonly ExecutionRequest[];
  readonly events: readonly ExecutionEvent[];
  readonly runs: readonly ExecutionRun[];
  readonly runEvents: readonly ExecutionRunEvent[];
  readonly adapters: readonly ExecutionAdapter[];
  readonly selectedCapabilityId: string;
  readonly operation: string;
  readonly message: string | null;
  readonly error: string | null;
  readonly busy: boolean;
}

export const initialExecutionConsoleState: ExecutionConsoleState = {
  phase: 'checking',
  capabilities: [],
  grants: [],
  requests: [],
  events: [],
  runs: [],
  runEvents: [],
  adapters: [],
  selectedCapabilityId: '',
  operation: 'observe',
  message: null,
  error: null,
  busy: false,
};

export interface ExecutionSnapshot {
  readonly capabilities: readonly ExecutionCapability[];
  readonly grants: readonly ExecutionGrant[];
  readonly events: readonly ExecutionEvent[];
  readonly runs: readonly ExecutionRun[];
  readonly runEvents: readonly ExecutionRunEvent[];
  readonly adapters: readonly ExecutionAdapter[];
}

/**
 * Reads the whole console snapshot.
 *
 * The v1 reads always run. The isolated-run reads are version-gated, and the
 * run-event page follows the most recent run, so a runtime without 1.3.0
 * support costs no extra requests.
 *
 * `requests` is deliberately absent: Conchbase publishes no request-list route,
 * so this console carries the requests it created locally. A reload must not
 * clear them.
 */
export async function loadExecutionSnapshot(
  runsSupported: boolean,
  signal?: AbortSignal,
): Promise<ExecutionSnapshot> {
  const [capabilities, grants, events, adapters, runs] = await Promise.all([
    listExecutionCapabilities(signal),
    listExecutionGrants(signal),
    getExecutionEvents(undefined, 100, signal),
    runsSupported
      ? listExecutionAdapters(signal)
      : Promise.resolve({ version: '1.3.0' as const, adapters: [] as ExecutionAdapter[] }),
    runsSupported
      ? listExecutionRuns(signal)
      : Promise.resolve({ version: '1.3.0' as const, runs: [] as ExecutionRun[] }),
  ]);

  const latestRun = runs.runs[runs.runs.length - 1];
  const runEvents = latestRun === undefined
    ? { version: '1.3.0' as const, events: [] as ExecutionRunEvent[], nextCursor: null, hasMore: false }
    : await getExecutionRunEvents(latestRun.id, signal);

  return {
    capabilities: capabilities.capabilities,
    grants: grants.grants,
    events: events.events,
    adapters: adapters.adapters,
    runs: runs.runs,
    runEvents: runEvents.events,
  };
}
