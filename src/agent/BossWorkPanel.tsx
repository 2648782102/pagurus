import { useEffect, useState } from 'react';
import {
  bossReportStateLabel,
  bossWorkerStateLabel,
  buildBossWorkView,
  type BossWorkView,
} from './boss-work-view.js';
import { supportsOrganizationContract, getOrganizationSession } from '../shared/api/organization.js';
import type { AgentChatMessage } from '../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../shared/api/runtime.js';

const STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  failed: '失败',
  ready: '完成',
  running: '执行中',
  open: '待处理',
  info: '记录',
});

function projectStateLabel(state: string): string {
  if (state === 'resumed') return '已恢复';
  if (state === 'quiet') return '已收敛';
  if (state === 'archived') return '已归档';
  return state === 'active' ? '进行中' : state;
}

function shortId(id: string): string {
  return id.length > 18 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
}

function readableProject(id: string): string {
  return id
    .replace(/^project[_-]/i, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** A read-only work strip inside the single Boss conversation. */
export function BossWorkPanel({ runtime, messages }: {
  readonly runtime: RuntimeInfo | null;
  readonly messages: readonly AgentChatMessage[];
}) {
  const messagesKey = JSON.stringify(messages.map((message) => [message.id, message.body, message.author]));
  const [view, setView] = useState<BossWorkView | null>(null);
  const supported = supportsOrganizationContract(runtime);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    const load = () => {
      getOrganizationSession()
        .then((session) => {
          if (!active) return;
          setView(buildBossWorkView({
            conversation: null,
            session,
            messages,
          }));
        })
        .catch(() => {
          if (!active) return;
          setView(null);
        });
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [supported, messagesKey]);

  if (!supported || view === null || view.projects.length === 0) return null;
  const openAttention = view.attention.filter((item) => item.state === 'open');
  const activeProjects = view.projects.filter((project) => project.state === 'active' || project.state === 'resumed');

  return (
    <section className="boss-work" aria-label="正在推进">
      <div className="boss-work-head">
        <div>
          <h2>正在推进</h2>
          <p>只读取 Runtime 发布的项目、员工、汇报与 Attention。</p>
        </div>
        <div className="boss-work-counts" aria-label="工作摘要">
          <span><strong>{activeProjects.length}</strong> 进行中</span>
          <span><strong>{view.projects.length}</strong> 项目</span>
          <span className={openAttention.length > 0 ? 'is-attention' : ''}>
            <strong>{openAttention.length}</strong> 待你处理
          </span>
        </div>
      </div>

      {openAttention.length > 0 && (
        <div className="boss-work-attention" role="status">
          <strong>需要你的输入</strong>
          {openAttention.map((item) => (
            <p key={item.id}>{item.workerName ?? item.workerId}：请在主会话里回答这条 Attention。</p>
          ))}
        </div>
      )}

      <ol className="boss-work-projects">
        {view.projects.slice(-3).map((project) => (
          <li key={project.id} className={`boss-work-project is-${project.state}`}>
            <div className="boss-work-project-head">
              <strong>{readableProject(project.id)}</strong>
              <span>{projectStateLabel(project.state)}</span>
            </div>
            <div className="boss-work-project-id">{shortId(project.id)}</div>
            {project.workers.length > 0 && (
              <ul className="boss-work-workers">
                {project.workers.slice(-3).map((worker) => {
                  const failed = worker.reportState === 'failed';
                  const done = worker.reportState === 'ready';
                  return (
                    <li key={worker.id} className={failed ? 'is-failed' : done ? 'is-done' : ''}>
                      <span className="boss-work-worker-name">{worker.name}</span>
                      <span className="boss-work-worker-state">
                        {bossWorkerStateLabel(worker.state)}
                        {worker.reportState ? ` · ${bossReportStateLabel(worker.reportState)}` : ''}
                      </span>
                      {failed && worker.reportDetail && <p>{worker.reportDetail}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {view.notices.length > 0 && (
        <details className="boss-work-notices">
          <summary>最近回报（{view.notices.length}）</summary>
          <ol>
            {view.notices.slice(-5).reverse().map((notice) => (
              <li key={notice.id} className={`is-${notice.state}`}>
                <span>{notice.workerName ?? 'Runtime'}</span>
                <code>{STATE_LABELS[notice.state] ?? notice.state}</code>
                <p>{notice.body}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
