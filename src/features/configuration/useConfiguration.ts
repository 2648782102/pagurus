import { useCallback, useEffect, useRef, useState } from 'react';
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
import { resolveDraft } from './configuration-draft.js';
import { errorMessage } from '../../shared/ui/errors.js';

export type ConfigurationPhase =
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'disconnected'
  | 'validating'
  | 'validated'
  | 'applying';

export interface ConfigurationViewState {
  phase: ConfigurationPhase;
  revision: ConfigurationRevision | null;
  revisions: readonly ConfigurationRevisionSummary[];
  supportsComposition: boolean;
  draft: string;
  validatedDraft: string | null;
  message: string | null;
  issues: readonly { path: string; reason: string }[];
}

const initialState: ConfigurationViewState = {
  phase: 'loading',
  revision: null,
  revisions: [],
  supportsComposition: false,
  draft: '',
  validatedDraft: null,
  message: null,
  issues: [],
};

function toDraft(revision: ConfigurationRevision | null): string {
  return revision ? `${JSON.stringify(revision.document, null, 2)}\n` : '';
}

export function useConfiguration() {
  const [state, setState] = useState<ConfigurationViewState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

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
            message: '当前 Conchbase 未提供配置版本能力，请升级到 0.5.0 或更新版本。',
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
        supportsComposition: runtime.capabilities.includes('composition-execution'),
        draft: toDraft(result.revision),
        validatedDraft: null,
        message: null,
        issues: [],
      });
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'disconnected',
        message: errorMessage(cause, '无法读取配置版本'),
      }));
    }
  }, []);

  const setDraft = useCallback((draft: string) => {
    setState((current) => ({ ...current, draft, validatedDraft: null, message: null, issues: [] }));
  }, []);

  const apply = useCallback(async () => {
    const current = stateRef.current;
    const resolved = resolveDraft(current.draft, current.supportsComposition);
    if (!resolved.ok) {
      setState((value) => ({
        ...value,
        phase: 'ready',
        message: resolved.message,
        issues: [resolved.issue],
      }));
      return;
    }
    setState((current) => ({ ...current, phase: 'applying', message: null, issues: [] }));
    try {
      // Validation is an explicit earlier step. Apply submits the draft; the
      // Runtime validates it again inside the write path, so it never needs a
      // second client-side validate round trip.
      const result = await applyConfiguration(resolved.document);
      setState({
        phase: 'ready',
        revision: result.revision,
        revisions: result.revisions,
        supportsComposition: current.supportsComposition,
        draft: toDraft(result.revision),
        validatedDraft: null,
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
        message: errorMessage(cause, '应用配置失败'),
      }));
    }
  }, []);

  const validate = useCallback(async () => {
    const current = stateRef.current;
    const resolved = resolveDraft(current.draft, current.supportsComposition);
    if (!resolved.ok) {
      setState((value) => ({
        ...value,
        phase: 'ready',
        message: resolved.message,
        issues: [resolved.issue],
      }));
      return;
    }
    setState((value) => ({ ...value, phase: 'validating', message: null, issues: [] }));
    try {
      await validateConfiguration(resolved.document);
      setState((value) => ({
        ...value,
        phase: 'ready',
        validatedDraft: current.draft,
        message: '校验通过。还没有写入运行时。',
        issues: [],
      }));
    } catch (cause) {
      if (cause instanceof ConfigurationValidationError) {
        setState((value) => ({
          ...value,
          phase: 'ready',
          message: '配置校验未通过，运行时状态没有改变。',
          issues: cause.details,
        }));
        return;
      }
      setState((value) => ({
        ...value,
        phase: 'disconnected',
        message: errorMessage(cause, '校验配置失败'),
      }));
    }
  }, []);

  const rollbackTo = useCallback(async (revisionId: string) => {
    const current = stateRef.current;
    setState((current) => ({ ...current, phase: 'applying', message: null, issues: [] }));
    try {
      const result = await rollbackConfiguration(revisionId);
      setState({
        phase: 'ready',
        revision: result.revision,
        revisions: result.revisions,
        supportsComposition: current.supportsComposition,
        draft: toDraft(result.revision),
        validatedDraft: null,
        message: result.changed ? '已切换到所选配置版本。' : '所选版本已经是当前版本。',
        issues: [],
      });
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'disconnected',
        message: errorMessage(cause, '回滚失败'),
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return {
    ...state,
    setDraft,
    liveDraft: toDraft(state.revision),
    load: () => void load(),
    apply: () => void apply(),
    validate: () => void validate(),
    rollbackTo: (revisionId: string) => void rollbackTo(revisionId),
  };
}
