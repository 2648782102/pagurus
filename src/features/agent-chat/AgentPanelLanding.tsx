import type { useAgentChat } from './useAgentChat.js';
import { EmptyState, Field, Section, Select, Tag } from '../../shared/ui/primitives.js';

type Chat = ReturnType<typeof useAgentChat>;

/**
 * The Agent Chat entry surface. Landing here means "choose who to talk to",
 * not "resume whatever I said last". History is presented per Agent so the two
 * decisions — who, and continue-or-new — are made in one place.
 */
export function AgentPanelLanding({ chat }: { chat: Chat }) {
  const selectedAgent = chat.agents.find((agent) => agent.id === chat.selectedAgentId);
  const history = chat.recent.filter((entry) => entry.agentId === chat.selectedAgentId);

  return (
    <div className="agent-landing">
      <header className="agent-landing-heading">
        <div>
          <p className="agent-chat-kicker">AGENT 面板</p>
          <h2 id="agent-chat-title">选择 Agent</h2>
          <p className="agent-chat-intro">
            左侧选择身份，右侧确认模型与思考强度；需要时再从历史会话继续。
          </p>
        </div>
      </header>

      {chat.agents.length === 0 ? (
        <div className="work-notice" role="status">
          <p>还没有可用的 Agent。请先在 Agent 页面创建并配置一个。</p>
        </div>
      ) : (
        <div className="agent-landing-grid">
          <section className="agent-picker" aria-labelledby="agent-picker-title">
            <div className="agent-picker-heading">
              <h3 id="agent-picker-title">可用 Agent</h3>
              <Tag>{chat.agents.length} 个</Tag>
            </div>
            <ul className="agent-picker-list">
              {chat.agents.map((agent) => {
                const active = agent.id === chat.selectedAgentId;
                const count = chat.recent.filter((entry) => entry.agentId === agent.id).length;
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className={`agent-picker-item${active ? ' is-active' : ''}`}
                      onClick={() => chat.selectAgent(agent.id)}
                      aria-pressed={active}
                      disabled={chat.busy}
                    >
                      <span className="agent-picker-name">
                        {agent.name}
                        {agent.isDefault && <Tag tone="success">默认</Tag>}
                        {agent.id === 'boss-agent' && <Tag tone="warning">老板</Tag>}
                      </span>
                      <span className="agent-picker-meta">
                        {count > 0 ? `${count} 个历史会话` : '暂无历史会话'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="agent-launcher" aria-labelledby="agent-launcher-title">
            <div className="agent-launcher-heading">
              <div>
                <p className="agent-chat-kicker">新对话</p>
                <h3 id="agent-launcher-title">
                  {selectedAgent ? selectedAgent.name : '选择 Agent 后开始'}
                </h3>
              </div>
              {selectedAgent?.isDefault && <Tag tone="success">默认</Tag>}
            </div>

            <div className="agent-launcher-options">
              <Field label="对话模型" htmlFor="agent-chat-model">
              <Select
                id="agent-chat-model"
                value={chat.selectedModelReference}
                onChange={(event) => chat.setSelectedModelReference(event.target.value)}
                disabled={chat.busy}
              >
                {chat.models.length === 0 && <option value="">暂无可用模型</option>}
                {chat.models.map((model) => (
                  <option key={model.reference} value={model.reference}>
                    {model.displayName} · {model.providerId}
                  </option>
                ))}
              </Select>
              </Field>
              <Field label="思考强度" htmlFor="agent-chat-reasoning">
              <Select
                id="agent-chat-reasoning"
                value={chat.reasoningEffort}
                onChange={(event) => chat.setReasoningEffort(event.target.value as 'low' | 'medium' | 'high')}
                disabled={chat.busy}
              >
                <option value="low">低 · 更快</option>
                <option value="medium">中 · 平衡</option>
                <option value="high">高 · 更深</option>
              </Select>
              </Field>
              <p className="agent-chat-setup-note">
                模型列表来自 Magpie；供应商、凭证与路由仍在 Magpie 中配置。
              </p>
              <button
                className="button-primary"
                type="button"
                onClick={chat.startConversation}
                disabled={chat.busy || chat.selectedAgentId.length === 0}
              >
                {chat.busy ? '正在开启…' : '开启新对话'}
              </button>
            </div>
          </section>
        </div>
      )}

      <Section
        className="agent-history"
        id="agent-history-title"
        title="继续最近的对话"
        description={selectedAgent ? `${selectedAgent.name} · ${history.length} 个历史会话` : `${chat.recent.length} 个历史会话`}
      >
        {history.length === 0 ? (
          <EmptyState title="这个 Agent 还没有历史会话" description="开启新对话后，它会出现在这里。" />
        ) : (
          <ul className="agent-history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <div className="agent-history-copy">
                  <strong>{entry.lastMessagePreview || '（空会话）'}</strong>
                  <small>
                    {formatTime(entry.createdAt)} · {entry.messageCount} 条消息 · 思考强度 {entry.reasoningEffort}
                  </small>
                </div>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void chat.resumeConversation(entry.id)}
                  disabled={chat.busy}
                >
                  继续对话
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {chat.error && <div className="work-error" role="alert"><p>{chat.error}</p></div>}
    </div>
  );
}

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '未知时间';
  return parsed.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
