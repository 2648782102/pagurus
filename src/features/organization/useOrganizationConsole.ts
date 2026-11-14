import { useCallback, useEffect, useRef, useState } from 'react';
import {
  decideOrganizationAttention,
  getOrganizationEvents,
  getOrganizationProjectThreads,
  getOrganizationSession,
  listOrganizationAttentionFrom,
  listOrganizationDelegationsFrom,
  listOrganizationReportsFrom,
  listOrganizationWorkItems,
  organizationAttentionDetail,
  organizationWorkerProposals,
  organizationWorkItems as organizationWorkItemsFrom,
  submitOrganizationIntent,
  supportsOrganizationContract,
  type OrganizationAttentionRecord,
  type OrganizationEventRecord,
  type OrganizationProjectThreadList,
  type OrganizationSessionView,
  type OrganizationWorkItemRecord,
} from '../../shared/api/organization.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

export type OrganizationConsolePhase =
  | 'checking'
  | 'unsupported'
  | 'loading'
  | 'ready'
  | 'error';

export interface OrganizationConsoleState {
  readonly phase: OrganizationConsolePhase;
  readonly session: OrganizationSessionView | null;
  readonly events: readonly OrganizationEventRecord[];
  readonly eventCursor: string | null;
  readonly eventHasMore: boolean;
  readonly projectThreads: OrganizationProjectThreadList | null;
  readonly workItemViews: readonly OrganizationWorkItemRecord[];
  readonly selectedAttentionId: string;
  readonly selectedProjectId: string;
  readonly intentText: string;
  readonly message: string | null;
  readonly error: string | null;
  readonly busy: boolean;
  readonly refreshing: boolean;
  readonly autoRefresh: boolean;
  readonly lastUpdatedAt: string | null;
}

const initialState: OrganizationConsoleState = {
  phase: 'checking',
  session: null,
  events: [],
  eventCursor: null,
  eventHasMore: false,
  projectThreads: null,
  workItemViews: [],
  selectedAttentionId: '',
  selectedProjectId: '',
  intentText: '',
  message: null,
  error: null,
  busy: false,
  refreshing: false,
  autoRefresh: true,
  lastUpdatedAt: null,
};

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : '组织状态读取失败';
}

function latestEventCursor(events: readonly OrganizationEventRecord[]): string | null {
  return events.length === 0 ? null : events[events.length - 1]!.id;
}

export function useOrganizationConsole(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<OrganizationConsoleState>(initialState);
  const supported = supportsOrganizationContract(runtime);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async (signal?: AbortSignal, mode: 'full' | 'incremental' = 'full') => {
    const current = stateRef.current;
    if (!runtime) {
      setState((value) => ({ ...value, phase: 'checking', error: null, refreshing: false }));
      return;
    }
    if (!supported) {
      setState((value) => ({ ...value, phase: 'unsupported', error: null, refreshing: false }));
      return;
    }
    if (mode === 'full') {
      setState((value) => ({ ...value, phase: 'loading', error: null, refreshing: true }));
    } else {
      setState((value) => ({ ...value, refreshing: true, error: null }));
    }
    try {
      const after = mode === 'incremental' ? current.eventCursor ?? undefined : undefined;
      const [session, eventPage, workItems] = await Promise.all([
        getOrganizationSession(signal),
        getOrganizationEvents(after, 100, signal),
        listOrganizationWorkItems(signal),
      ]);
      if (signal?.aborted) return;
      const openAttention = session.attentionRequests.find((request) => request.state === 'open');
      const selectedProjectId = session.projects.some((project) => project.id === current.selectedProjectId)
        ? current.selectedProjectId
        : session.projects[0]?.id ?? '';
      const projectThreads = selectedProjectId
        ? await getOrganizationProjectThreads(selectedProjectId, signal)
        : null;
      if (signal?.aborted) return;
      setState((value) => {
        const merged = mode === 'incremental'
          ? [...value.events, ...eventPage.events].filter((event, index, all) =>
            all.findIndex((candidate) => candidate.id === event.id) === index)
          : eventPage.events;
        const ordered = [...merged].sort((left, right) => left.sequence - right.sequence);
        const nextCursor = latestEventCursor(ordered) ?? eventPage.nextCursor ?? value.eventCursor;
        return {
          ...value,
          phase: 'ready',
          session,
          events: Object.freeze(ordered),
          eventCursor: nextCursor,
          eventHasMore: eventPage.hasMore,
          projectThreads,
          workItemViews: workItems.workItems,
          selectedAttentionId: openAttention?.id ?? value.selectedAttentionId,
          selectedProjectId,
          error: null,
          refreshing: false,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
    } catch (cause) {
      if (signal?.aborted) return;
      setState((value) => ({
        ...value,
        phase: mode === 'full' ? 'error' : value.phase,
        error: errorText(cause),
        refreshing: false,
      }));
    }
  }, [runtime, supported]);

  const selectProject = useCallback(async (selectedProjectId: string) => {
    setState((value) => ({ ...value, selectedProjectId, projectThreads: null }));
    try {
      const threads = await getOrganizationProjectThreads(selectedProjectId);
      setState((value) => ({ ...value, projectThreads: threads }));
    } catch (cause) {
      setState((value) => ({ ...value, error: errorText(cause) }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal, 'full');
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!supported || !state.autoRefresh || state.busy || state.phase === 'error') return;
    const timer = setInterval(() => {
      const controller = new AbortController();
      void load(controller.signal, 'incremental');
      return () => controller.abort();
    }, 4000);
    return () => clearInterval(timer);
  }, [load, state.autoRefresh, state.busy, state.phase, supported]);

  const setIntentText = useCallback((intentText: string) => {
    setState((value) => ({ ...value, intentText, error: null, message: null }));
  }, []);

  const selectAttention = useCallback((selectedAttentionId: string) => {
    setState((value) => ({ ...value, selectedAttentionId }));
  }, []);

  const setAutoRefresh = useCallback((autoRefresh: boolean) => {
    setState((value) => ({ ...value, autoRefresh }));
  }, []);

  const submitIntent = useCallback(async () => {
    const text = stateRef.current.intentText.trim();
    if (!supported || text.length === 0 || stateRef.current.session === null) return;
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      const result = await submitOrganizationIntent({
        text,
        idempotencyKey: `pagurus-${globalThis.crypto.randomUUID()}`,
      });
      setState((value) => ({
        ...value,
        busy: false,
        intentText: '',
        message: `意图已被接受（${result.intentId}）；等待 Runtime 发布新状态。`,
      }));
      await load(undefined, 'incremental');
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load, supported]);

  const decideAttention = useCallback(async (
    kind: 'answer' | 'withdraw',
    record: OrganizationAttentionRecord,
  ) => {
    setState((value) => ({ ...value, busy: true, error: null, message: null }));
    try {
      await decideOrganizationAttention(record.id, kind, record.expectedVersion);
      setState((value) => ({
        ...value,
        busy: false,
        message: kind === 'answer' ? 'Attention 已回答。' : 'Attention 已撤回。',
      }));
      await load(undefined, 'incremental');
    } catch (cause) {
      setState((value) => ({ ...value, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  const selectedAttention = state.session
    ? organizationAttentionDetail(state.session, state.selectedAttentionId)
    : undefined;
  const orderedAttention = state.session
    ? listOrganizationAttentionFrom(state.session).attentionRequests
    : [];
  const reports = state.session ? listOrganizationReportsFrom(state.session).reports : [];
  const delegations = state.session ? listOrganizationDelegationsFrom(state.session).delegations : [];
  const proposals = state.session ? organizationWorkerProposals(state.session) : [];
  const workItems = state.workItemViews.length > 0
    ? state.workItemViews
    : state.session
      ? organizationWorkItemsFrom(state.session).workItems
      : [];
  const recentEvents = [...state.events].slice(-24).reverse();

  return {
    ...state,
    supported,
    selectedAttention,
    orderedAttention,
    projects: state.session?.projects ?? [],
    proposals,
    delegations,
    workItems,
    reports,
    recentEvents,
    timeline: [...state.events].sort((left, right) => left.sequence - right.sequence),
    setIntentText,
    selectAttention,
    selectProject: (projectId: string) => void selectProject(projectId),
    setAutoRefresh,
    submitIntent: () => void submitIntent(),
    answerAttention: (record: OrganizationAttentionRecord) => void decideAttention('answer', record),
    withdrawAttention: (record: OrganizationAttentionRecord) => void decideAttention('withdraw', record),
    load: () => void load(undefined, 'full'),
  };
}
