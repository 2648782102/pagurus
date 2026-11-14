import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { AgentChatComposer } from './AgentChatComposer.js';
import { AgentChatThread } from './AgentChatThread.js';
import { useAgentChat } from './useAgentChat.js';

interface AgentChatPanelProps {
  readonly runtime: RuntimeInfo | null;
}

export function AgentChatPanel({ runtime }: AgentChatPanelProps) {
  const chat = useAgentChat(runtime);
  const activeName = chat.activeAgent?.name ?? 'Agent';

  return (
    <section className="work-panel agent-chat-panel" id="agent-chat" aria-labelledby="agent-chat-title">
      {!chat.supported ? (
        <>
          <div className="section-heading"><h2 id="agent-chat-title">Agent 对话</h2></div>
          <div className="work-notice" role="status">
            <p>当前 Runtime 未发布 <code>agentChatContract: 1.6.0</code>，Agent 对话保持关闭。</p>
          </div>
        </>
      ) : !chat.conversation ? (
        <div className="agent-chat-setup-shell">
          <p className="agent-chat-kicker">先配置，再开始对话</p>
          <h2 id="agent-chat-title">和哪个 Agent 聊？</h2>
          <p className="agent-chat-intro">选择一个配置好的 Agent。普通 Agent 会调用你配置好的模型；老板 Agent 会进入组织编排。</p>
          <div className="agent-chat-setup-card">
            <label htmlFor="agent-chat-agent">Agent</label>
            <select id="agent-chat-agent" value={chat.selectedAgentId}
              onChange={(event) => chat.setSelectedAgentId(event.target.value)} disabled={chat.busy}>
              {chat.agents.length === 0 && <option value="">暂无可用 Agent</option>}
              {chat.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}{agent.isDefault ? ' · 默认' : ''}
                </option>
              ))}
            </select>
            <label htmlFor="agent-chat-model">对话模型</label>
            <select id="agent-chat-model" value={chat.selectedModelReference}
              onChange={(event) => chat.setSelectedModelReference(event.target.value)} disabled={chat.busy}>
              {chat.models.length === 0 && <option value="">暂无可用模型</option>}
              {chat.models.map((model) => (
                <option key={model.reference} value={model.reference}>
                  {model.displayName} · {model.providerId} / {model.modelId}
                </option>
              ))}
            </select>
            <p className="agent-chat-setup-note">模型列表来自 Magpie；供应商、凭证与路由仍在 Magpie 中由用户配置。</p>
            <label htmlFor="agent-chat-reasoning">思考强度</label>
            <select id="agent-chat-reasoning" value={chat.reasoningEffort}
              onChange={(event) => chat.setReasoningEffort(event.target.value as 'low' | 'medium' | 'high')}
              disabled={chat.busy}>
              <option value="low">低 · 更快</option>
              <option value="medium">中 · 平衡</option>
              <option value="high">高 · 更深</option>
            </select>
            {chat.recent.length > 0 && (
              <p className="agent-chat-setup-note">已恢复最近会话；重新开始会创建新会话。</p>
            )}
            <button className="button-primary" type="button" onClick={chat.startConversation}
              disabled={chat.busy || chat.selectedAgentId.length === 0}>
              {chat.busy ? '正在开启…' : '开始对话'}
            </button>
          </div>
          {chat.error && <div className="work-error" role="alert"><p>{chat.error}</p></div>}
        </div>
      ) : (
        <div className="agent-chat-shell">
          <header className="agent-chat-header">
            <div>
              <p className="agent-chat-kicker">正在对话</p>
              <h2 id="agent-chat-title">{activeName}</h2>
              <p className="agent-chat-subtitle">{chat.conversation.providerId}:{chat.conversation.modelId}</p>
              <p className="agent-chat-subtitle">思考强度：{chat.conversation.reasoningEffort}</p>
            </div>
            <div className="agent-chat-header-actions">
              <button className="button-secondary" type="button" onClick={() => chat.setDetailsOpen(!chat.detailsOpen)}
                aria-expanded={chat.detailsOpen} aria-controls="agent-chat-details">会话信息</button>
              <button className="button-secondary" type="button" onClick={chat.resetConversation}>更换 Agent</button>
            </div>
          </header>

          {chat.detailsOpen && (
            <dl className="history-detail-grid agent-chat-pins" id="agent-chat-details">
              <div><dt>Agent revision</dt><dd><code>{chat.conversation.agentRevisionId}</code></dd></div>
              <div><dt>Configuration</dt><dd><code>{chat.conversation.configurationRevisionId}</code></dd></div>
              <div><dt>Conversation</dt><dd><code>{chat.conversation.id}</code></dd></div>
            </dl>
          )}
          {chat.conversation.agentId === 'boss-agent' && (
            <p className="agent-chat-mode-note">老板 Agent：直接对话；需要时由 Runtime 校验组织动作。当前未接入网页搜索、本机文件或设备查询。</p>
          )}
          {chat.error && <div className="work-error" role="alert"><p>{chat.error}</p></div>}

          <AgentChatThread messages={chat.conversation.messages} agentName={activeName} />
          <AgentChatComposer
            draft={chat.draft}
            busy={chat.busy}
            waiting={chat.hasPending}
            onDraftChange={chat.setDraft}
            onSend={chat.sendMessage}
          />
        </div>
      )}
    </section>
  );
}
