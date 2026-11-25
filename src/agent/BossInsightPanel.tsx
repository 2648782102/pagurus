import { buildBossInsightView } from './boss-insight-view.js';
import type { AgentChatMessage } from '../shared/api/agent-chat.js';
import { runtimeNoticeBody } from './RuntimeNoticeBody.js';

const STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  attention: '待你处理',
  failed: '异常',
  success: '完成',
  info: '记录',
});

/** A right-side command rail built only from the current Boss conversation. */
export function BossInsightPanel({ messages }: { readonly messages: readonly AgentChatMessage[] }) {
  const view = buildBossInsightView(messages);
  return (
    <aside className="boss-insight" aria-label="指挥台">
      <header className="boss-insight-head">
        <h2>指挥台</h2>
        <p>{view.turns} 轮对话</p>
      </header>

      <section aria-labelledby="boss-focus-title">
        <h3 id="boss-focus-title">当前焦点</h3>
        <p className="boss-insight-focus">
          {view.focus ?? '还没有明确目标。直接告诉 Boss 你想完成什么。'}
        </p>
      </section>

      <section aria-labelledby="boss-insight-attention-title">
        <h3 id="boss-insight-attention-title">需要你处理</h3>
        {view.attention.length === 0 ? (
          <p className="boss-insight-empty">没有阻塞项，Boss 可以继续推进。</p>
        ) : (
          <ol className="boss-insight-signals">
            {view.attention.map((item) => (
              <li key={item.id} className={`is-${item.state} anim-attention-glow`}>
                <span>{item.label}</span>
                {runtimeNoticeBody(item.body)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="boss-insight-signals-title">
        <h3 id="boss-insight-signals-title">最近回报</h3>
        {view.signals.length === 0 ? (
          <p className="boss-insight-empty">员工回报会出现在这里。</p>
        ) : (
          <ol className="boss-insight-signals">
            {view.signals.map((item) => (
              <li key={item.id} className={`is-${item.state}`}>
                <span>{STATE_LABELS[item.state] ?? item.label}</span>
                {runtimeNoticeBody(item.body)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer>只整理 Runtime 已发布的会话事件。</footer>
    </aside>
  );
}
