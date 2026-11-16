import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { AgentChatComposer } from '../features/agent-chat/AgentChatComposer.js';
import { AgentChatThread } from '../features/agent-chat/AgentChatThread.js';
import { AgentPanelLanding } from '../features/agent-chat/AgentPanelLanding.js';
import { Notice } from '../shared/ui/primitives.js';
import { useAgentSurface } from './useAgentSurface.js';
import { AgentSidebar } from './AgentSidebar.js';

const CONNECTION_LABELS: Readonly<Record<RuntimeConnectionState, string>> = {
  checking: '正在连接',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
};

/**
 * The shipped Agent product.
 *
 * It is deliberately not the console: no runtime policy, no capability
 * directory, no secret handles, no workspace switcher. Those are operator
 * tools. A user of this surface chooses an Agent, talks to it, and can see the
 * pinned model revision behind the reply.
 */
export function AgentApp() {
  const runtimeStatus = useRuntimeStatus();
  const chat = useAgentSurface(runtimeStatus.runtime);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = chat.conversation ? `${chat.title} · Pagurus` : 'Pagurus · Agent';
  }, [chat.conversation, chat.title]);

  const focusComposer = useCallback(() => {
    document.getElementById('agent-message')?.focus();
  }, []);

  if (!chat.supported) {
    return (
      <div className="agent-app agent-app-blocked">
        <Notice tone={runtimeStatus.state === 'disconnected' ? 'danger' : 'warning'}>
          {runtimeStatus.state === 'disconnected'
            ? `无法连接到本机 Runtime：${runtimeStatus.error?.message ?? '连接失败'}`
            : '当前 Runtime 未发布 Agent Chat 合同，产品界面暂时不可用。控制台中的运行时状态页可以查看详情。'}
        </Notice>
      </div>
    );
  }

  return (
    <div className="agent-app">
      <AgentSidebar
        open={sidebarOpen}
        agents={chat.agents}
        conversations={chat.recent}
        activeAgentId={chat.conversation?.agentId ?? chat.selectedAgentId}
        activeConversationId={chat.conversation?.id ?? null}
        connection={CONNECTION_LABELS[runtimeStatus.state]}
        connectionState={runtimeStatus.state}
        onToggle={() => setSidebarOpen((value) => !value)}
        onSelectAgent={chat.selectAgent}
        onResume={chat.resumeConversation}
        onNew={chat.restart}
      />

      <main className="agent-main">
        {chat.conversation === null ? (
          <div className="agent-main-scroll">
            <AgentPanelLanding
              view={{
                agents: chat.agents,
                selectedAgentId: chat.selectedAgentId,
                models: chat.models,
                selectedModelReference: chat.selectedModelReference,
                reasoningEffort: chat.reasoningEffort,
                recent: chat.recent,
                busy: chat.busy,
                error: chat.error,
              }}
              actions={{
                selectAgent: chat.selectAgent,
                setSelectedModelReference: chat.setSelectedModelReference,
                setReasoningEffort: chat.setReasoningEffort,
                startConversation: chat.startConversation,
                resumeConversation: chat.resumeConversation,
              }}
            />
            {chat.error && <div className="agent-inline-error" role="alert">{chat.error}</div>}
          </div>
        ) : (
          <>
            <header className="agent-main-header">
              <div className="agent-main-identity">
                <span className="agent-main-avatar" aria-hidden="true">{chat.title.slice(0, 1)}</span>
                <div>
                  <h1>{chat.title}</h1>
                  <p>
                    {chat.pinSummary?.provider}:{chat.pinSummary?.model}
                    <span aria-hidden="true"> · </span>
                    思考强度 {chat.pinSummary?.effort}
                  </p>
                </div>
              </div>
              <div className="agent-main-status" role="status">
                {chat.hasPending
                  ? chat.streamConnected
                    ? chat.streamStalled ? '已切换为轮询同步' : '正在回复'
                    : chat.streamAttempt > 0 ? '正在重新连接' : '正在同步'
                  : '就绪'}
              </div>
            </header>

            {chat.isBoss && (
              <p className="agent-boss-note">
                这是老板 Agent：可以用自然语言提需求；涉及组织变更时，由 Runtime 校验后执行。
              </p>
            )}
            {chat.error && <div className="agent-inline-error" role="alert">{chat.error}</div>}

            <div className="agent-conversation">
              <AgentChatThread
                messages={chat.conversation.messages}
                agentName={chat.title}
                busy={chat.busy}
                onDecision={chat.decideApproval}
              />
              <div ref={conversationEndRef} />
              <AgentChatComposer
                draft={chat.draft}
                busy={chat.busy}
                waiting={chat.hasPending}
                onDraftChange={chat.setDraft}
                onSend={() => { chat.sendMessage(); focusComposer(); }}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
