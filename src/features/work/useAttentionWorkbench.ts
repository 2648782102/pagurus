import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  completeWorkItem,
  decideDeliveryReceipt,
  getWorkItem,
  listWorkDeliveryReceipts,
  listWorkEvents,
  listWorkItems,
  reconcileAssignment,
  startWorkItem,
  stopWorkItem,
  supportsAsynchronousWorkControl,
  supportsDurableWorkContract,
  supportsLocalSourcePolicy,
  type WorkDeliveryReceipt,
  type WorkEvent,
  type WorkItem,
  type WorkItemDetail,
  type WorkState,
} from '../../shared/api/work.js';
import { ingestLocalSourceEvent, type SourcePolicy } from '../../shared/api/platform.js';
import type { RuntimeInfo as RuntimeStatusInfo } from '../../shared/api/runtime.js';

export type AttentionWorkbenchPhase =
  | 'checking'
  | 'unsupported'
  | 'loading'
  | 'ready'
  | 'error';

export interface AttentionWorkbenchState {
  phase: AttentionWorkbenchPhase;
  workItems: readonly WorkItem[];
  deliveryReceipts: readonly WorkDeliveryReceipt[];
  events: readonly WorkEvent[];
  selectedWorkItemId: string;
  detail: WorkItemDetail | null;
  error: string | null;
  actionLabel: string | null;
  actionMessage: string | null;
  supportsControls: boolean;
  supportsSourcePolicy: boolean;
}

const initialState: AttentionWorkbenchState = {
  phase: 'checking',
  workItems: [],
  deliveryReceipts: [],
  events: [],
  selectedWorkItemId: '',
  detail: null,
  error: null,
  actionLabel: null,
  actionMessage: null,
  supportsControls: false,
  supportsSourcePolicy: false,
};

type ActionCapability = 'asynchronous-work-control' | 'local-source-policy' | 'durable-work-contract';

export function useAttentionWorkbench(runtime: RuntimeStatusInfo | null) {
  const [state, setState] = useState<AttentionWorkbenchState>(initialState);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!runtime) {
      setState((current) => ({ ...current, phase: 'checking', error: null }));
      return;
    }
    if (!supportsDurableWorkContract(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null }));
      return;
    }
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const [items, receipts, events] = await Promise.all([
        listWorkItems(signal),
        listWorkDeliveryReceipts(signal),
        listWorkEvents(signal),
      ]);
      if (signal?.aborted) return;
      const selectedWorkItemId = items.workItems.some((item) => item.id === state.selectedWorkItemId)
        ? state.selectedWorkItemId
        : items.workItems[0]?.id ?? '';
      const detail = selectedWorkItemId
        ? await getWorkItem(selectedWorkItemId, signal)
        : null;
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'ready',
        workItems: items.workItems,
        deliveryReceipts: receipts.deliveryReceipts,
        events: events.events,
        selectedWorkItemId,
        detail,
        error: null,
        supportsControls: supportsAsynchronousWorkControl(runtime),
        supportsSourcePolicy: supportsLocalSourcePolicy(runtime),
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : '持久工作读取失败',
      }));
    }
  }, [runtime, state.selectedWorkItemId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const runAction = useCallback(async (
    label: string,
    action: () => Promise<unknown>,
    message: string,
    capability: ActionCapability,
  ) => {
    const enabled = capability === 'asynchronous-work-control'
      ? supportsAsynchronousWorkControl(runtime)
      : capability === 'local-source-policy'
        ? supportsLocalSourcePolicy(runtime)
        : supportsDurableWorkContract(runtime);
    if (!enabled) {
      setState((current) => ({
        ...current,
        actionLabel: null,
        error: `当前 Runtime 未发布 ${capability}，相关控制保持关闭。`,
      }));
      return;
    }
    setState((current) => ({ ...current, actionLabel: label, actionMessage: null }));
    try {
      await action();
      setState((current) => ({ ...current, actionLabel: null, actionMessage: message }));
      await load();
    } catch (cause) {
      setState((current) => ({
        ...current,
        actionLabel: null,
        error: cause instanceof Error ? cause.message : '工作控制失败',
      }));
    }
  }, [load, runtime]);

  const select = useCallback(async (workItemId: string, signal?: AbortSignal) => {
    setState((current) => ({ ...current, selectedWorkItemId: workItemId, detail: null }));
    if (!supportsDurableWorkContract(runtime)) return;
    try {
      const detail = await getWorkItem(workItemId, signal);
      if (signal?.aborted) return;
      setState((current) => ({ ...current, detail, error: null }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : '工作项详情读取失败',
      }));
    }
  }, [runtime]);

  const receiptsForSelection = useMemo(() => state.deliveryReceipts.filter(
    (receipt) => receipt.workItemId === state.selectedWorkItemId,
  ), [state.deliveryReceipts, state.selectedWorkItemId]);

  const eventsForSelection = useMemo(() => state.events.filter(
    (event) => event.workItemId === state.selectedWorkItemId || event.workItemId === 'runtime',
  ), [state.events, state.selectedWorkItemId]);

  return {
    ...state,
    receiptsForSelection,
    eventsForSelection,
    load: () => void load(),
    select: (workItemId: string) => void select(workItemId),
    start: (workItemId: string, expectedState: WorkState) => void runAction(
      'start', () => startWorkItem(workItemId, expectedState), '工作项已启动', 'asynchronous-work-control',
    ),
    stop: (workItemId: string, expectedState: WorkState) => void runAction(
      'stop', () => stopWorkItem(workItemId, expectedState), '工作项已停止', 'asynchronous-work-control',
    ),
    complete: (workItemId: string, expectedState: WorkState) => void runAction(
      'complete', () => completeWorkItem(workItemId, expectedState), '工作项已完成', 'asynchronous-work-control',
    ),
    reconcile: (assignmentId: string, outcome: 'succeeded' | 'failed') => void runAction(
      `reconcile:${outcome}`, () => reconcileAssignment(assignmentId, outcome), '恢复状态已记录', 'asynchronous-work-control',
    ),
    decide: (receiptId: string, decision: 'accepted' | 'rejected') => void runAction(
      `decision:${decision}`, () => decideDeliveryReceipt(receiptId, decision), '交付决策已记录', 'durable-work-contract',
    ),
    source: (threadKey: string, policy: SourcePolicy) => void runAction(
      `source:${policy}`, () => ingestLocalSourceEvent({
        sourceId: 'pagurus-local',
        threadKey,
        payloadDigest: `sha256:${'a'.repeat(64)}`,
        occurredAt: new Date().toISOString(),
        policy,
        mandateDigest: `sha256:${'b'.repeat(64)}`,
      }), `本地 Source 事件已按 ${policy} 记录`, 'local-source-policy',
    ),
  };
}
