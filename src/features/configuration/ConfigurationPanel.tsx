import { useConfiguration } from './useConfiguration.js';
import type { ConfigurationDocument } from '../../shared/api/configuration.js';
import { Button, Field, Notice, Section, Textarea } from '../../shared/ui/primitives.js';
import { formatConfigurationSummary } from './configuration-summary.js';

/**
 * The runtime-wide policy revision.
 *
 * The page answers four different operator questions, in the order they ask
 * them: what is live now, what would change, is the draft safe, and how do I
 * get back to an earlier revision. Editing is kept in a separate draft so the
 * live document is never edited in place.
 */
export function ConfigurationPanel() {
  const configuration = useConfiguration();
  const busy = configuration.phase === 'validating'
    || configuration.phase === 'applying';
  const canEdit = configuration.phase !== 'loading'
    && configuration.phase !== 'unsupported'
    && configuration.phase !== 'disconnected';
  const live = configuration.revision?.document ?? null;
  const dirty = configuration.draft !== configuration.liveDraft;
  const validated = dirty && configuration.validatedDraft === configuration.draft;

  return (
    <Section
      className="config-panel"
      id="configuration-title"
      title="配置版本"
      description="一份版本化的全局配置；任务创建时会固定当时的版本"
      action={
        <Button size="sm" type="button" onClick={configuration.load} disabled={busy}>
          {configuration.phase === 'loading' ? '读取中…' : '刷新'}
        </Button>
      }
    >
      <p className="config-intro">
        这是全局策略，不是 Agent profile，也不是能力安装器。这里列出的引用只是数据；
        Conchbase 负责校验、应用，并把生效版本固定到之后创建的任务。
      </p>

      {configuration.phase === 'loading' && <p className="task-hint" role="status">正在读取当前配置版本…</p>}
      {configuration.phase === 'unsupported' && (
        <Notice tone="warning">{configuration.message}</Notice>
      )}
      {configuration.phase === 'disconnected' && (
        <Notice tone="danger" action={<Button size="sm" type="button" onClick={configuration.load}>重新加载</Button>}>
          {configuration.message}
        </Notice>
      )}
      {configuration.message
        && configuration.phase !== 'disconnected'
        && configuration.phase !== 'unsupported' && (
        <p className="config-message" role="status">{configuration.message}</p>
      )}

      {live && <ConfigurationLive revisionId={configuration.revision!.id}
        appliedAt={configuration.revision!.appliedAt} document={live} />}

      {canEdit && <>
        <section className="config-section" aria-labelledby="configuration-draft-title">
          <header className="config-section-head">
            <div>
              <h3 id="configuration-draft-title">编辑草稿</h3>
              <p>草稿不会影响正在运行的任务。先校验，再决定是否应用。</p>
            </div>
            <span className={dirty ? 'config-dirty is-dirty' : 'config-dirty'}>
              {dirty ? '有未应用的修改' : '与生效版本一致'}
            </span>
          </header>

          {configuration.issues.length > 0 && (
            <ul className="config-issues" aria-label="配置校验问题">
              {configuration.issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}><code>{issue.path}</code> · {issue.reason}</li>
              ))}
            </ul>
          )}

          <Field
            label="配置文档（JSON）"
            hint="接受 schemaVersion 1 或 2。不要输入密钥值；secretRefs 只保存不透明引用。"
            htmlFor="configuration-document"
          >
            <Textarea
              id="configuration-document"
              value={configuration.draft}
              onChange={(event) => configuration.setDraft(event.target.value)}
              spellCheck={false}
              rows={14}
              disabled={busy}
              aria-describedby="configuration-document-help"
            />
          </Field>

          <div className="task-actions">
            <Button type="button" onClick={configuration.validate} disabled={busy || !dirty}>
              {configuration.phase === 'validating' ? '校验中…' : '只校验'}
            </Button>
            <Button variant="primary" type="button" onClick={configuration.apply}
              disabled={busy || !validated}>
              {configuration.phase === 'applying' ? '应用中…' : '应用到运行时'}
            </Button>
            <Button type="button" onClick={() => configuration.setDraft(configuration.liveDraft)}
              disabled={busy || !dirty}>
              放弃修改
            </Button>
          </div>
          {validated && (
            <p className="config-gate">校验通过。现在可以应用；应用会创建一个新的不可变版本。</p>
          )}
        </section>

        <section className="config-section" aria-labelledby="configuration-history-title">
          <header className="config-section-head">
            <div>
              <h3 id="configuration-history-title">版本历史</h3>
              <p>共 {configuration.revisions.length} 个版本。恢复历史版本会创建一个新的当前版本，不删除任何记录。</p>
            </div>
          </header>
          {configuration.revisions.length === 0 && <p className="task-hint">Runtime 尚未发布版本历史。</p>}
          <ul className="config-revisions">
            {[...configuration.revisions].reverse().map((revision) => {
              const isCurrent = revision.id === configuration.revision?.id;
              return (
                <li className={isCurrent ? 'is-current' : undefined} key={revision.id}>
                  <div>
                    <strong>{revision.name}</strong>
                    <code>{revision.id}</code>
                  </div>
                  <span>{isCurrent ? '生效中' : formatAppliedAt(revision.appliedAt)}</span>
                  {!isCurrent && (
                    <Button size="sm" type="button" disabled={busy}
                      onClick={() => configuration.rollbackTo(revision.id)}>
                      恢复此版本
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </>}
    </Section>
  );
}

function ConfigurationLive({
  revisionId,
  appliedAt,
  document,
}: {
  readonly revisionId: string;
  readonly appliedAt: string;
  readonly document: ConfigurationDocument;
}) {
  const summary = formatConfigurationSummary(document);
  return (
    <section className="config-live" aria-labelledby="configuration-live-title">
      <header className="config-section-head">
        <div>
          <h3 id="configuration-live-title">当前生效</h3>
          <p><code>{revisionId}</code> · {formatAppliedAt(appliedAt)}</p>
        </div>
        <span className="config-dirty">schemaVersion {document.schemaVersion}</span>
      </header>
      <dl className="config-facts">
        <div><dt>名称</dt><dd>{document.name}</dd></div>
        {summary.map((entry) => (
          <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>
        ))}
      </dl>
    </section>
  );
}

function formatAppliedAt(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN');
}
