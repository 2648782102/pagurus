import { useState } from 'react';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { formatSupportBundle, type DiagnosticCheck } from '../../shared/api/operations.js';
import { Button, Section, StatusDot, Tag } from '../../shared/ui/primitives.js';
import { useRuntimeData } from './use-runtime-data.js';

/**
 * "Where is my data, and is my environment healthy?"
 *
 * Both answers already exist in the Runtime (and previously only in the CLI).
 * They are read-only: the panel reports the database location and size and a
 * redacted check list, and never shows contents.
 */
export function RuntimeDataPanel({ runtime }: { readonly runtime: RuntimeInfo | null }) {
  const { phase, data, checks, error, notice, busy, backup, bundle, reload, runBackup, loadBundle, reportNotice } =
    useRuntimeData(runtime);
  /* Local to the panel: the path being typed and the copy acknowledgement. */
  const [target, setTarget] = useState('');
  const [copied, setCopied] = useState(false);
  const supported = runtime !== null;

  const copyBundle = (): void => {
    if (!bundle) return;
    /* The copy result is presentation; the bundle itself comes from the hook. */
    void navigator.clipboard.writeText(formatSupportBundle(bundle)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      /* The hook cannot see this one: the refusal happens in the browser. */
      () => reportNotice('复制失败：浏览器未授予剪贴板权限，可手动选择文本复制。'),
    );
  };

  return (
    <Section
      className="runtime-data-panel"
      id="runtime-data-title"
      title="数据与诊断"
      description="数据库位置、体积与环境检查；只读，不含内容"
      action={<Button size="sm" type="button" onClick={reload}
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

          <h4 className="runtime-data-subhead">备份</h4>
          <div className="runtime-data-actions">
            <label className="runtime-data-target">
              <span className="task-hint">备份到（绝对路径，文件不能已存在）</span>
              <input
                type="text"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="/Users/你/Desktop/conchbase-backup.sqlite"
                aria-label="备份目标绝对路径"
              />
            </label>
            <Button size="sm" type="button" disabled={busy} onClick={() => runBackup(target)}>
              {busy ? '处理中…' : '备份'}
            </Button>
          </div>
          {backup && (
            <p className="task-hint" role="status">
              {backup.ok
                ? `已备份到 ${backup.target}（${formatBytes(backup.sizeBytes)}，完整性 ${backup.integrity}）`
                : `备份未通过校验：${backup.error ?? backup.integrity}`}
            </p>
          )}

          <h4 className="runtime-data-subhead">支持包</h4>
          <div className="runtime-data-actions">
            <Button size="sm" type="button" disabled={busy} onClick={() => void loadBundle()}>生成支持包</Button>
            {bundle && (
              <Button size="sm" type="button" onClick={() => void copyBundle()}>
                {copied ? '已复制' : '复制'}
              </Button>
            )}
            {bundle && (
              <span className="task-hint">
                诊断 {bundle.summary.status}{bundle.summary.nextStep ? ` — ${bundle.summary.nextStep}` : ''}
              </span>
            )}
          </div>
          {bundle && <pre className="runtime-data-bundle" aria-label="支持包内容">{formatSupportBundle(bundle)}</pre>}
          <p className="task-hint">支持包只含版本、数据位置和检查结果，不含提示词、对话内容或文件正文。</p>
          {notice && <p className="task-hint" role="alert">{notice}</p>}
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
 * The Runtime now distinguishes "this port is me" from "someone else holds it"
 * (Conchbase `f1946c1`), so the panel renders the check verbatim. Older Runtimes
 * that still report a self-held port as a conflict are honestly shown as a
 * warning rather than papered over here.
 */
function toneOf(check: DiagnosticCheck): 'success' | 'warning' | 'danger' {
  return check.status === 'ok' ? 'success' : check.status === 'warn' ? 'warning' : 'danger';
}

function labelOf(check: DiagnosticCheck): string {
  return check.status;
}

function detailOf(check: DiagnosticCheck): string {
  return check.detail;
}
