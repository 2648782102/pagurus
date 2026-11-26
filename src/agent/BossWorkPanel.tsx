import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bossReportStateLabel,
  bossWorkerStateLabel,
  buildBossWorkView,
  type BossWorkView,
} from './boss-work-view.js';
import { supportsOrganizationContract, getOrganizationSession } from '../shared/api/organization.js';
import type { AgentChatMessage } from '../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../shared/api/runtime.js';
import { StateDot, type StateDotState } from '../dsh/primitives/StateDot.js';
import { Tag, type TagTone } from '../dsh/primitives/Tag.js';

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

/**
 * Project state in DSH's tag vocabulary.
 *
 * The work rail is a reading surface, so its labels use DSH's read-only `Tag`
 * tones: `success` for a finished state, `info` for work in progress, `quiet`
 * for a state that is simply parked. The word is always rendered — tone is a
 * second signal, never the only one.
 */
function projectTone(state: string): TagTone {
  if (state === 'archived' || state === 'quiet') return 'quiet';
  if (state === 'active' || state === 'resumed') return 'info';
  if (state === 'failed') return 'danger';
  return 'outline';
}

/** Worker activity in DSH's five-state dot vocabulary. */
function workerDot(activity: string): StateDotState {
  if (activity === 'active') return 'ongoing';
  if (activity === 'done') return 'done';
  if (activity === 'failed') return 'error';
  if (activity === 'attention') return 'warning';
  return 'idle';
}

/** A read-only work rail for one Boss conversation. */
export function BossWorkPanel({ runtime, messages }: {
  readonly runtime: RuntimeInfo | null;
  readonly messages: readonly AgentChatMessage[];
}) {
  const messagesKey = JSON.stringify(messages.map((message) => [message.id, message.body, message.author]));
  const [view, setView] = useState<BossWorkView>(() => buildBossWorkView({
    conversation: null, session: null, messages: [],
  }));
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const previousActivity = useRef(new Map<string, string>());
  const supported = supportsOrganizationContract(runtime);

  const retry = useCallback(() => {
    setLoadError(false);
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    const load = () => {
      getOrganizationSession()
        .then((session) => {
          if (!active) return;
          setLoadError(false);
          setView(buildBossWorkView({
            conversation: null,
            session,
            messages,
          }));
        })
        .catch(() => {
          if (!active) return;
          setLoadError(true);
        });
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [supported, messagesKey, reloadKey]);

  if (!supported) return null;
  const openAttention = view.attention.filter((item) => item.state === 'open');
  const activeProjects = view.projects.filter((project) => project.state === 'active' || project.state === 'resumed');
  const workerMotionClass = (id: string, activity: string): string => {
    const previous = previousActivity.current.get(id);
    previousActivity.current.set(id, activity);
    if (previous !== undefined && previous !== activity) return ' anim-state-settle';
    return '';
  };

  return (
    <aside className={`boss-work-rail${collapsed ? ' is-collapsed' : ''}`} aria-label="正在推进">
      <header className="boss-work-head">
        <h2>正在推进</h2>
        <p>只读取 Runtime 发布的项目、员工、汇报与 Attention。</p>
        <button
          type="button"
          className="boss-work-collapse"
          aria-label={collapsed ? '展开工作面板' : '收起工作面板'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
        {loadError && (
          <p role="status" className="boss-work-error">
            组织状态暂时无法读取，显示最近一次已知信息。
            <button type="button" onClick={retry}>重试读取组织状态</button>
          </p>
        )}
        <dl className="boss-work-counts" aria-label="工作摘要">
          <div><dt>进行中</dt><dd>{activeProjects.length}</dd></div>
          <div><dt>项目</dt><dd>{view.projects.length}</dd></div>
          <div className={openAttention.length > 0 ? 'is-attention' : ''}>
            <dt>待你处理</dt><dd>{openAttention.length}</dd>
          </div>
        </dl>
      </header>

      <section className="boss-work-attention" aria-labelledby="boss-attention-title" role="status">
        <h3 id="boss-attention-title">需要你处理</h3>
        {openAttention.length === 0 ? (
          <p className="boss-work-quiet">没有需要打断你的事项。</p>
        ) : (
          <ol>
            {openAttention.map((item) => (
              <li key={item.id} className="anim-attention-glow">
                <span>{item.workerName ?? item.workerId}</span>
                <p>请在主会话里回答这条 Attention。</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="boss-work-projects" aria-labelledby="boss-projects-title">
        <h3 id="boss-projects-title">项目</h3>
        <ol>
          {view.projects.slice(-3).map((project) => (
            <li key={project.id} className={`boss-work-project is-${project.state}${project.workers.some((worker) => worker.activity === 'active') ? ' anim-live-sweep' : ''}`}>
              <header>
                <strong>{readableProject(project.id)}</strong>
                <Tag tone={projectTone(project.state)}>{projectStateLabel(project.state)}</Tag>
              </header>
              <code>{shortId(project.id)}</code>
              {project.workers.length > 0 && (
                <ul>
                  {project.workers.slice(-3).map((worker) => (
                    <li key={worker.id} className={`is-${worker.activity}${workerMotionClass(worker.id, worker.activity)}`}>
                      <StateDot state={workerDot(worker.activity)} />
                      <span className="boss-work-worker-name">{worker.name}</span>
                      <span className="boss-work-worker-state">
                        {bossWorkerStateLabel(worker.state)}
                        {worker.reportState ? ` · ${bossReportStateLabel(worker.reportState)}` : ''}
                      </span>
                      {worker.reportDetail && <p>{worker.reportDetail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

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
    </aside>
  );
}
