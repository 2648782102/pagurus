import { useCallback, useEffect, useState } from 'react';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { getDiagnostics, getRuntimeData, type DiagnosticCheck, type RuntimeDataInfo } from '../../shared/api/operations.js';
import { Button, Section, StatusDot, Tag } from '../../shared/ui/primitives.js';
import { errorMessage } from '../../shared/ui/errors.js';

type Phase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

/**
 * "Where is my data, and is my environment healthy?"
 *
 * Both answers already exist in the Runtime (and previously only in the CLI).
 * They are read-only: the panel reports the database location and size and a
 * redacted check list, and never shows contents.
 */
export function RuntimeDataPanel({ runtime }: { readonly runtime: RuntimeInfo | null }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [data, setData] = useState<RuntimeDataInfo | null>(null);
  const [checks, setChecks] = useState<readonly DiagnosticCheck[]>([]);
  const [error, setError] = useState<string | null>(null);

  /*
   * The Runtime does not advertise these routes as a capability, so gating on
   * one would disable the panel forever. Probe instead: a 404 means an older
   * Runtime, which is a genuine "unsupported", while other failures are errors.
   */
  const supported = runtime !== null;

  const load = useCallback(async (signal?: AbortSignal) => {
    if (runtime === null) {
      setPhase('checking');
      return;
    }
    if (!supported) {
      setPhase('unsupported');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const [info, results] = await Promise.all([getRuntimeData(signal), getDiagnostics(signal)]);
      if (signal?.aborted) return;
      setData(info);
      setChecks(results);
      setPhase('ready');
    } catch (cause) {
      if (signal?.aborted) return;
      if (/HTTP\s404/.test(cause instanceof Error ? cause.message : '')) {
        setPhase('unsupported');
        return;
      }
      setError(errorMessage(cause, '读取运行时数据失败'));
      setPhase('error');
    }
  }, [runtime, supported]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <Section
      className="runtime-data-panel"
      id="runtime-data-title"
      title="数据与诊断"
      description="数据库位置、体积与环境检查；只读，不含内容"
      action={<Button size="sm" type="button" onClick={() => void load()}
        disabled={!supported || phase === 'loading'}>
        {phase === 'loading' ? '读取中…' : '刷新'}
      </Button>}
    >
      {phase === 'checking' && <p className="task-hint" role="status">正在检查 Runtime 是否提供数据接口…</p>}
      {phase === 'unsupported' && (
        <p className="task-hint">
          当前 Runtime 未发布 <code>runtime-operations</code> 能力；升级后这里会自动可用。
        </p>
      )}
      {phase === 'error' && <p className="task-hint" role="alert">{error}</p>}

      {phase === 'ready' && data && (
        <>
          <dl className="history-detail-grid">
            <div><dt>数据库</dt><dd><code>{data.databasePath}</code></dd></div>
            <div><dt>体积</dt><dd>{formatBytes(data.sizeBytes)}</dd></div>
            <div><dt>schema 版本</dt><dd>{data.schemaVersion}</dd></div>
            <div><dt>状态</dt><dd>{data.exists ? '存在' : '尚未创建'}</dd></div>
          </dl>

          <h4 className="runtime-data-subhead">环境检查</h4>
          {checks.length === 0
            ? <p className="task-hint">Runtime 未返回检查项。</p>
            : (
              <ul className="runtime-data-checks" aria-label="环境检查">
                {checks.map((check) => (
                  <li key={check.id}>
                    <StatusDot tone={toneOf(check)} />
                    <code>{check.id}</code>
                    <Tag tone={toneOf(check)}>
                      {labelOf(check)}
                    </Tag>
                    <span>{detailOf(check)}</span>
                  </li>
                ))}
              </ul>
            )}
        </>
      )}
    </Section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The Runtime's own port check probes the socket it is already listening on,
 * so a healthy instance always reports "in use". Until the Runtime distinguishes
 * "this is me" from "someone else", present that case as what it actually
 * means here — the instance is up — instead of a conflict the user must fix.
 */
function isSelfPortCheck(check: DiagnosticCheck): boolean {
  return check.id === 'runtime-port' && check.status === 'warn' && /already in use/.test(check.detail);
}

function toneOf(check: DiagnosticCheck): 'success' | 'warning' | 'danger' {
  if (isSelfPortCheck(check)) return 'success';
  return check.status === 'ok' ? 'success' : check.status === 'warn' ? 'warning' : 'danger';
}

function labelOf(check: DiagnosticCheck): string {
  if (isSelfPortCheck(check)) return 'listening';
  return check.status;
}

function detailOf(check: DiagnosticCheck): string {
  return isSelfPortCheck(check) ? '本实例正在监听该端口。' : check.detail;
}
