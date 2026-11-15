import type {
  AgentChatAgent,
  AgentChatConversationSummary,
  AgentChatModel,
  AgentChatReasoningEffort,
} from '../../shared/api/agent-chat.js';
import { Button, EmptyState, Field, Section, Select, Tag } from '../../shared/ui/primitives.js';

export interface AgentLandingView {
  readonly agents: readonly AgentChatAgent[];
  readonly selectedAgentId: string;
  readonly models: readonly AgentChatModel[];
  readonly selectedModelReference: string;
  readonly reasoningEffort: AgentChatReasoningEffort;
  readonly recent: readonly AgentChatConversationSummary[];
  readonly busy: boolean;
  readonly error: string | null;
}

export interface AgentLandingActions {
  readonly selectAgent: (agentId: string) => void;
  readonly setSelectedModelReference: (reference: string) => void;
  readonly setReasoningEffort: (effort: AgentChatReasoningEffort) => void;
  readonly startConversation: () => void;
  readonly resumeConversation: (conversationId: string) => Promise<void>;
}

/**
 * The Agent Chat entry surface. Landing here means "choose who to talk to",
 * not "resume whatever I said last". History is presented per Agent so the two
 * decisions — who, and continue-or-new — are made in one place.
 */
export function AgentPanelLanding({
  view,
  actions,
}: {
  readonly view: AgentLandingView;
  readonly actions: AgentLandingActions;
}) {
  const selectedAgent = view.agents.find((agent) => agent.id === view.selectedAgentId);
  const history = view.recent.filter((entry) => entry.agentId === view.selectedAgentId);

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

      {view.agents.length === 0 ? (
        <div className="work-notice" role="status">
          <p>还没有可用的 Agent。请先在 Agent 页面创建并配置一个。</p>
        </div>
      ) : (
        <div className="agent-landing-grid">
          <section className="agent-picker" aria-labelledby="agent-picker-title">
            <div className="agent-picker-heading">
              <h3 id="agent-picker-title">可用 Agent</h3>
              <Tag>{view.agents.length} 个</Tag>
            </div>
            <ul className="agent-picker-list">
              {view.agents.map((agent) => {
                const active = agent.id === view.selectedAgentId;
                const count = view.recent.filter((entry) => entry.agentId === agent.id).length;
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className={`agent-picker-item${active ? ' is-active' : ''}`}
                      onClick={() => actions.selectAgent(agent.id)}
                      aria-pressed={active}
                      disabled={view.busy}
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
                value={view.selectedModelReference}
                onChange={(event) => actions.setSelectedModelReference(event.target.value)}
                disabled={view.busy}
              >
                {view.models.length === 0 && <option value="">暂无可用模型</option>}
                {view.models.map((model) => (
                  <option key={model.reference} value={model.reference}>
                    {model.displayName} · {model.providerId}
                  </option>
                ))}
              </Select>
              </Field>
              <Field label="思考强度" htmlFor="agent-chat-reasoning">
              <Select
                id="agent-chat-reasoning"
                value={view.reasoningEffort}
                onChange={(event) => actions.setReasoningEffort(event.target.value as AgentChatReasoningEffort)}
                disabled={view.busy}
              >
                <option value="low">低 · 更快</option>
                <option value="medium">中 · 平衡</option>
                <option value="high">高 · 更深</option>
              </Select>
              </Field>
              <p className="agent-chat-setup-note">
                模型列表来自 Magpie；供应商、凭证与路由仍在 Magpie 中配置。
              </p>
              <Button
                variant="primary"
                onClick={actions.startConversation}
                disabled={view.busy || view.selectedAgentId.length === 0}
              >
                {view.busy ? '正在开启…' : '开启新对话'}
              </Button>
            </div>
          </section>
        </div>
      )}

      <Section
        className="agent-history"
        id="agent-history-title"
        title="继续最近的对话"
        description={selectedAgent ? `${selectedAgent.name} · ${history.length} 个历史会话` : `${view.recent.length} 个历史会话`}
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
                <Button
                  size="sm"
                  onClick={() => void actions.resumeConversation(entry.id)}
                  disabled={view.busy}
                >
                  继续对话
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {view.error && <div className="work-error" role="alert"><p>{view.error}</p></div>}
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
