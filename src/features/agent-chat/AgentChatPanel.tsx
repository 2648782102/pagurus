import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { Button } from '../../shared/ui/primitives.js';
import { AgentChatComposer } from './AgentChatComposer.js';
import { AgentChatThread } from './AgentChatThread.js';
import { useAgentChat } from './useAgentChat.js';
import { AgentPanelLanding } from './AgentPanelLanding.js';

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
            <p>当前 Runtime 未发布 <code>agentChatContract: 1.8.0</code>，Agent 对话保持关闭。</p>
          </div>
        </>
      ) : !chat.conversation ? (
        <AgentPanelLanding chat={chat} />
      ) : (
        <div className="agent-chat-shell">
          <header className="agent-chat-header">
            <div>
              <div className="agent-chat-identity">
                <span className="agent-chat-avatar" aria-hidden="true">{activeName.slice(0, 1)}</span>
                <div>
                  <p className="agent-chat-kicker">正在对话</p>
                  <h2 id="agent-chat-title">{activeName}</h2>
                </div>
              </div>
              <p className="agent-chat-subtitle">{chat.conversation.providerId}:{chat.conversation.modelId} · 思考强度 {chat.conversation.reasoningEffort}</p>
              {chat.hasPending && (
                <p className="agent-chat-subtitle" role="status">
                  {chat.streamConnected
                    ? chat.streamStalled
                      ? '实时流暂无更新，已恢复轮询'
                      : '实时连接'
                    : chat.streamAttempt > 0
                      ? `实时流重连中（第 ${chat.streamAttempt} 次），当前轮询同步`
                      : '轮询同步'}
                </p>
              )}
            </div>
            <div className="agent-chat-header-actions">
              <Button size="sm" type="button" onClick={() => chat.setDetailsOpen(!chat.detailsOpen)}
                aria-expanded={chat.detailsOpen} aria-controls="agent-chat-details">会话信息</Button>
              <Button size="sm" type="button" onClick={chat.resetConversation}>更换 Agent</Button>
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

          <div className="agent-chat-conversation">
            <AgentChatThread
              messages={chat.conversation.messages}
              agentName={activeName}
              busy={chat.busy}
              onDecision={chat.decideApproval}
            />
            <AgentChatComposer
              draft={chat.draft}
              busy={chat.busy}
              waiting={chat.hasPending}
              onDraftChange={chat.setDraft}
              onSend={chat.sendMessage}
            />
          </div>
        </div>
      )}
    </section>
  );
}
