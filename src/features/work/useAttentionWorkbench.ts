import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getWorkItem,
  listWorkDeliveryReceipts,
  listWorkItems,
  supportsDurableWorkContract,
  type WorkDeliveryReceipt,
  type WorkItem,
  type WorkItemDetail,
} from '../../shared/api/work.js';
import { type RuntimeInfo as RuntimeStatusInfo } from '../../shared/api/runtime.js';

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
  selectedWorkItemId: string;
  detail: WorkItemDetail | null;
  error: string | null;
}

const initialState: AttentionWorkbenchState = {
  phase: 'checking',
  workItems: [],
  deliveryReceipts: [],
  selectedWorkItemId: '',
  detail: null,
  error: null,
};

export function useAttentionWorkbench(runtime: RuntimeStatusInfo | null) {
  const [state, setState] = useState<AttentionWorkbenchState>(initialState);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!supportsDurableWorkContract(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null }));
      return;
    }
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const [items, receipts] = await Promise.all([
        listWorkItems(signal),
        listWorkDeliveryReceipts(signal),
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
        selectedWorkItemId,
        detail,
        error: null,
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

  return {
    ...state,
    receiptsForSelection,
    load: () => void load(),
    select: (workItemId: string) => void select(workItemId),
  };
}
