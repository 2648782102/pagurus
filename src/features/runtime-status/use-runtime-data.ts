import { useCallback, useEffect, useState } from 'react';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import {
  createBackup,
  getDiagnostics,
  getRuntimeData,
  getSupportBundle,
  type BackupResult,
  type DiagnosticCheck,
  type RuntimeDataInfo,
  type SupportBundle,
} from '../../shared/api/operations.js';
import { errorMessage } from '../../shared/ui/errors.js';

export type RuntimeDataPhase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

/**
 * "Where is my data, and is my environment healthy?"
 *
 * Both answers already exist in the Runtime and are read-only: the database
 * location and size, and a redacted check list. Nothing here reads contents.
 *
 * This lives outside the panel because the panel was doing the fetching. The
 * architecture test says a component receives data and callbacks; this one
 * held four transport calls and its own phase machine, which is exactly what
 * that rule exists to prevent — and the rule did not catch it, because it only
 * looked at two directories. See `tests/architecture.test.ts`.
 */
export interface RuntimeDataState {
  readonly phase: RuntimeDataPhase;
  readonly data: RuntimeDataInfo | null;
  readonly checks: readonly DiagnosticCheck[];
  readonly error: string | null;
  /** Set by a backup or support-bundle failure; separate from the load phase. */
  readonly notice: string | null;
  readonly busy: boolean;
  readonly backup: BackupResult | null;
  readonly bundle: SupportBundle | null;
  readonly reload: () => void;
  readonly runBackup: (target: string) => void;
  readonly loadBundle: () => void;
  readonly dismissNotice: () => void;
  /** Report a failure the hook cannot see, such as a refused clipboard. */
  readonly reportNotice: (message: string) => void;
}

export function useRuntimeData(runtime: RuntimeInfo | null): RuntimeDataState {
  const [phase, setPhase] = useState<RuntimeDataPhase>('checking');
  const [data, setData] = useState<RuntimeDataInfo | null>(null);
  const [checks, setChecks] = useState<readonly DiagnosticCheck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<BackupResult | null>(null);
  const [bundle, setBundle] = useState<SupportBundle | null>(null);
  const [generation, setGeneration] = useState(0);

  /*
   * The Runtime does not advertise these routes as a capability, so gating on
   * one would disable the panel forever. Probe instead: a 404 means an older
   * Runtime — a genuine "unsupported" — while other failures are errors.
   */
  useEffect(() => {
    if (runtime === null) {
      setPhase('checking');
      return;
    }
    const controller = new AbortController();
    setPhase('loading');
    setError(null);
    void (async () => {
      try {
        const [info, results] = await Promise.all([
          getRuntimeData(controller.signal),
          getDiagnostics(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setData(info);
        setChecks(results);
        setPhase('ready');
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (/HTTP\s404/.test(cause instanceof Error ? cause.message : '')) {
          setPhase('unsupported');
          return;
        }
        setError(errorMessage(cause, '读取运行时数据失败'));
        setPhase('error');
      }
    })();
    return () => controller.abort();
  }, [generation, runtime]);

  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const reportNotice = useCallback((message: string) => setNotice(message), []);

  const runBackup = useCallback((target: string) => {
    if (target.trim().length === 0) {
      setNotice('请填写一个绝对路径，例如 /Users/你/Desktop/conchbase-backup.sqlite');
      return;
    }
    setBusy(true);
    setNotice(null);
    void (async () => {
      try {
        setBackup(await createBackup(target.trim()));
        /* A backup changes the file, so the reported size is now stale. */
        reload();
      } catch (cause) {
        setNotice(errorMessage(cause, '备份失败'));
      } finally {
        setBusy(false);
      }
    })();
  }, [reload]);

  const loadBundle = useCallback(() => {
    setBusy(true);
    setNotice(null);
    void (async () => {
      try {
        setBundle(await getSupportBundle());
      } catch (cause) {
        setNotice(errorMessage(cause, '无法生成支持包'));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  return {
    phase, data, checks, error, notice, busy, backup, bundle,
    reload, runBackup, loadBundle, dismissNotice, reportNotice,
  };
}
