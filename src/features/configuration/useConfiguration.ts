import { useCallback, useEffect, useState } from 'react';
import {
  ConfigurationValidationError,
  applyConfiguration,
  getConfigurationState,
  rollbackConfiguration,
  validateConfiguration,
  type ConfigurationRevision,
  type ConfigurationRevisionSummary,
} from '../../shared/api/configuration.js';
import { getRuntimeInfo } from '../../shared/api/runtime.js';

export type ConfigurationPhase =
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'disconnected'
  | 'validating'
  | 'applying';

export interface ConfigurationViewState {
  phase: ConfigurationPhase;
  revision: ConfigurationRevision | null;
  revisions: readonly ConfigurationRevisionSummary[];
  draft: string;
  rollbackId: string;
  message: string | null;
  issues: readonly { path: string; reason: string }[];
}

const initialState: ConfigurationViewState = {
  phase: 'loading',
  revision: null,
  revisions: [],
  draft: '',
  rollbackId: '',
  message: null,
  issues: [],
};

function toDraft(revision: ConfigurationRevision | null): string {
  return revision ? `${JSON.stringify(revision.document, null, 2)}\n` : '';
}

export function useConfiguration() {
  const [state, setState] = useState<ConfigurationViewState>(initialState);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({
      ...current,
      phase: 'loading',
      message: null,
      issues: [],
    }));
    try {
      const runtime = await getRuntimeInfo(signal);
      if (!runtime.capabilities.includes('configuration-revisions')) {
        if (!signal?.aborted) {
          setState((current) => ({
            ...current,
            phase: 'unsupported',
            message: '当前 Conchbase 未提供配置版本能力，请升级到 0.4.0 或更新版本。',
          }));
        }
        return;
      }
      const result = await getConfigurationState(signal);
      if (signal?.aborted) return;
      setState({
        phase: 'ready',
        revision: result.revision,
        revisions: result.revisions,
        draft: toDraft(result.revision),
        rollbackId: '',
        message: null,
        issues: [],
      });
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'disconnected',
        message: cause instanceof Error ? cause.message : '无法读取配置版本',
      }));
    }
  }, []);

  const setDraft = useCallback((draft: string) => {
    setState((current) => ({ ...current, draft, message: null, issues: [] }));
  }, []);

  const setRollbackId = useCallback((rollbackId: string) => {
    setState((current) => ({ ...current, rollbackId, message: null }));
  }, []);

  const apply = useCallback(async () => {
    if (!state.draft.trim()) {
      setState((current) => ({
        ...current,
        phase: 'ready',
        message: '请输入完整的配置文档。',
        issues: [{ path: '$', reason: '文档不能为空' }],
      }));
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(state.draft) as unknown;
    } catch {
      setState((current) => ({
        ...current,
        phase: 'ready',
        message: '配置文档不是有效的 JSON。',
        issues: [{ path: '$', reason: '必须是有效的 JSON' }],
      }));
      return;
    }

    setState((current) => ({ ...current, phase: 'validating', message: null, issues: [] }));
    try {
      const document = await validateConfiguration(parsed);
      setState((current) => ({ ...current, phase: 'applying' }));
      const result = await applyConfiguration(document);
      setState({
        phase: 'ready',
        revision: result.revision,
        revisions: result.revisions,
        draft: toDraft(result.revision),
        rollbackId: '',
        message: result.changed ? '已应用新的配置版本。' : '内容与当前版本一致，没有创建新版本。',
        issues: [],
      });
    } catch (cause) {
      if (cause instanceof ConfigurationValidationError) {
        setState((current) => ({
          ...current,
          phase: 'ready',
          message: '配置校验未通过，运行时状态没有改变。',
          issues: cause.details,
        }));
        return;
      }
      setState((current) => ({
        ...current,
        phase: 'disconnected',
        message: cause instanceof Error ? cause.message : '应用配置失败',
      }));
    }
  }, [state.draft]);

  const rollback = useCallback(async () => {
    const revisionId = state.rollbackId;
    if (!revisionId) {
      setState((current) => ({ ...current, message: '请选择要回滚的版本。' }));
      return;
    }
    setState((current) => ({ ...current, phase: 'applying', message: null, issues: [] }));
    try {
      const result = await rollbackConfiguration(revisionId);
      setState({
        phase: 'ready',
        revision: result.revision,
        revisions: result.revisions,
        draft: toDraft(result.revision),
        rollbackId: '',
        message: result.changed ? '已切换到所选配置版本。' : '所选版本已经是当前版本。',
        issues: [],
      });
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'disconnected',
        message: cause instanceof Error ? cause.message : '回滚失败',
      }));
    }
  }, [state.rollbackId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return {
    ...state,
    setDraft,
    setRollbackId,
    load: () => void load(),
    apply: () => void apply(),
    rollback: () => void rollback(),
  };
}
