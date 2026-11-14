import { useCallback, useEffect, useState } from 'react';
import {
  decideOrganizationAttention,
  getOrganizationEvents,
  getOrganizationSession,
  organizationAttentionDetail,
  organizationWorkerProposals,
  organizationWorkItems,
  submitOrganizationIntent,
  supportsOrganizationContract,
  type OrganizationAttentionRecord,
  type OrganizationEventPage,
  type OrganizationSessionView,
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
  readonly events: OrganizationEventPage | null;
  readonly selectedAttentionId: string;
  readonly intentText: string;
  readonly message: string | null;
  readonly error: string | null;
  readonly busy: boolean;
}

const initialState: OrganizationConsoleState = {
  phase: 'checking',
  session: null,
  events: null,
  selectedAttentionId: '',
  intentText: '',
  message: null,
  error: null,
  busy: false,
};

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : '组织状态读取失败';
}

export function useOrganizationConsole(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<OrganizationConsoleState>(initialState);
  const supported = supportsOrganizationContract(runtime);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!runtime) {
      setState((current) => ({ ...current, phase: 'checking', error: null }));
      return;
    }
    if (!supported) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null }));
      return;
    }
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const [session, events] = await Promise.all([
        getOrganizationSession(signal),
        getOrganizationEvents(undefined, 100, signal),
      ]);
      if (signal?.aborted) return;
      const openAttention = session.attentionRequests.find((request) => request.state === 'open');
      setState((current) => ({
        ...current,
        phase: 'ready',
        session,
        events,
        selectedAttentionId: openAttention?.id ?? current.selectedAttentionId,
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({ ...current, phase: 'error', error: errorText(cause) }));
    }
  }, [runtime, supported]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setIntentText = useCallback((intentText: string) => {
    setState((current) => ({ ...current, intentText, error: null, message: null }));
  }, []);

  const selectAttention = useCallback((selectedAttentionId: string) => {
    setState((current) => ({ ...current, selectedAttentionId }));
  }, []);

  const submitIntent = useCallback(async () => {
    const text = state.intentText.trim();
    if (!supported || text.length === 0 || state.session === null) return;
    setState((current) => ({ ...current, busy: true, error: null, message: null }));
    try {
      const result = await submitOrganizationIntent({
        text,
        idempotencyKey: `pagurus-${globalThis.crypto.randomUUID()}`,
      });
      setState((current) => ({
        ...current,
        busy: false,
        intentText: '',
        message: `意图已被接受（${result.intentId}）；等待 Runtime 发布新状态。`,
      }));
      await load();
    } catch (cause) {
      setState((current) => ({ ...current, busy: false, error: errorText(cause) }));
    }
  }, [load, state.events, state.intentText, state.session, supported]);

  const decideAttention = useCallback(async (
    kind: 'answer' | 'withdraw',
    record: OrganizationAttentionRecord,
  ) => {
    setState((current) => ({ ...current, busy: true, error: null, message: null }));
    try {
      await decideOrganizationAttention(record.id, kind, record.expectedVersion);
      setState((current) => ({
        ...current,
        busy: false,
        message: kind === 'answer' ? 'Attention 已回答。' : 'Attention 已撤回。',
      }));
      await load();
    } catch (cause) {
      setState((current) => ({ ...current, busy: false, error: errorText(cause) }));
    }
  }, [load]);

  const selectedAttention = state.session ? organizationAttentionDetail(state.session, state.selectedAttentionId) : undefined;
  const orderedAttention = state.session
    ? [...state.session.attentionRequests].sort((left, right) =>
      Number(right.state === 'open') - Number(left.state === 'open') || left.sequence - right.sequence)
    : [];

  return {
    ...state,
    supported,
    selectedAttention,
    orderedAttention,
    projects: state.session?.projects ?? [],
    proposals: state.session ? organizationWorkerProposals(state.session) : [],
    delegations: state.session?.delegations ?? [],
    workItems: state.session ? organizationWorkItems(state.session).workItems : [],
    reports: state.session?.reports ?? [],
    recentEvents: state.events?.events.slice(-12).reverse() ?? [],
    setIntentText,
    selectAttention,
    submitIntent: () => void submitIntent(),
    answerAttention: (record: OrganizationAttentionRecord) => void decideAttention('answer', record),
    withdrawAttention: (record: OrganizationAttentionRecord) => void decideAttention('withdraw', record),
    load: () => void load(),
  };
}
