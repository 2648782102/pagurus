import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { AgentChatComposer } from '../features/agent-chat/AgentChatComposer.js';
import { AgentChatThread } from '../features/agent-chat/AgentChatThread.js';
import { Notice } from '../shared/ui/primitives.js';
import { useAgentSurface } from './useAgentSurface.js';
import { AgentChrome } from './AgentChrome.js';
import { AgentContextPanel } from './AgentContextPanel.js';
import { AgentAnswer } from './AgentAnswer.js';
import { AgentMessageActions } from './AgentMessageActions.js';
import { AgentModelMenu } from './AgentModelMenu.js';
import { AgentPrompt } from './AgentPrompt.js';
import { AgentThreadDrawer } from './AgentThreadDrawer.js';
import { useAgentCapabilities } from './useAgentCapabilities.js';
import { conversationTitle } from './agent-surface-model.js';
import { agentErrorText } from './agent-error-text.js';

const CONNECTION_LABELS: Readonly<Record<RuntimeConnectionState, string>> = {
  checking: '连接中',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
};

/**
 * The shipped Agent product.
 *
 * The shape is a page, not an application shell: one thin bar, one reading
 * column, one composer. History lives behind a drawer because most visits are
 * "finish a thought", not "manage a library"; the console remains the place to
 * inspect runtime state.
 *
 * Facts are unchanged from ADR 0040: one `useAgentChat` controller, the
 * published Agent Chat contract, and a resumed thread that actually has
 * messages.
 */
export function AgentApp() {
  const runtimeStatus = useRuntimeStatus();
  const chat = useAgentSurface(runtimeStatus.runtime);
  const agentCapabilities = useAgentCapabilities();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const threadsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const threadTitle = useMemo(() => {
    const messages = chat.conversation?.messages ?? [];
    const lastUser = [...messages].reverse().find((message) => message.author === 'user');
    if (!lastUser) return null;
    return conversationTitle(lastUser.body, messages.length);
  }, [chat.conversation]);

  useEffect(() => {
    document.title = chat.conversation ? `${chat.title} · Pagurus` : 'Pagurus · Agent';
  }, [chat.conversation, chat.title]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Return focus to the control that opened the sheet.
    threadsButtonRef.current?.focus();
  }, []);

  /**
   * Long threads need a way back to the newest turn.
   *
   * The thread owns its own scroll box and already follows the newest turn
   * while the reader is at the bottom. Once they scroll up to re-read,
   * following would fight them, so this shows one explicit control instead.
   */
  const jumpToLatest = useCallback(() => {
    const node = document.querySelector<HTMLElement>('.agent-chat-thread');
    node?.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, []);

  /**
   * Capability facts are read on demand, like the model popover does, because
   * they cost a second request to the Agent revision.
   */
  const inspectCapabilities = useCallback(() => {
    void agentCapabilities.load(chat.conversation?.agentId, chat.conversation?.agentRevisionId);
  }, [agentCapabilities, chat.conversation?.agentId, chat.conversation?.agentRevisionId]);

  const toggleContext = useCallback(() => {
    setContextOpen((open) => {
      if (!open) inspectCapabilities();
      return !open;
    });
  }, [inspectCapabilities]);

  // A sheet over the page must not let the page scroll behind it.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

  if (!chat.supported) {
    return (
      <div className="agent-app agent-app-blocked">
        <Notice tone={runtimeStatus.state === 'disconnected' ? 'danger' : 'warning'}>
          {runtimeStatus.state === 'disconnected'
            ? `无法连接到本机 Runtime：${runtimeStatus.error?.message ?? '连接失败'}`
            : '这个 Runtime 还没有发布 Agent 对话能力，产品界面暂时用不了。控制台里的运行时状态页有详情。'}
        </Notice>
      </div>
    );
  }

  return (
    <div className="agent-app">
      <AgentChrome
        agentName={chat.title}
        threadTitle={chat.conversation ? threadTitle : null}
        connection={CONNECTION_LABELS[runtimeStatus.state]}
        connectionState={runtimeStatus.state}
        pending={chat.hasPending}
        threadsButtonRef={threadsButtonRef}
        onOpenThreads={() => setDrawerOpen(true)}
        onNewThread={chat.restart}
        contextOpen={contextOpen}
        onToggleContext={toggleContext}
      />

      <div className={`agent-workspace${contextOpen ? ' has-context' : ''}`}>
        <main className="agent-page">
          {chat.conversation === null ? (
            <div className="agent-page-center">
              <AgentPrompt
                agents={chat.agents}
                selectedAgentId={chat.selectedAgentId}
                models={chat.models}
                selectedModelReference={chat.selectedModelReference}
                reasoningEffort={chat.reasoningEffort}
                draft={chat.draft}
                busy={chat.busy}
                error={chat.error}
                onSelectAgent={chat.selectAgent}
                onSelectModel={chat.setSelectedModelReference}
                onSelectEffort={chat.setReasoningEffort}
                onDraftChange={chat.setDraft}
                onSubmit={chat.startAndSend}
              />
            </div>
          ) : (
            <>
              <div className="agent-page-head">
                <AgentModelMenu
                  pinned={chat.pinSummary}
                  models={chat.models}
                  onStartNew={chat.restart}
                  capabilities={agentCapabilities.capabilities}
                  onInspect={() => void agentCapabilities.load(
                    chat.conversation?.agentId,
                    chat.conversation?.agentRevisionId,
                  )}
                />
                {chat.isBoss && <span className="agent-page-note">老板 Agent · 组织变更由 Runtime 校验后执行</span>}
              </div>

              {chat.error && (
                <div className="agent-inline-error" role="alert">
                  {agentErrorText(new Error(chat.error), '这条消息没有发出去，请再试一次。')}
                </div>
              )}

              <div className="agent-thread-area">
                <AgentChatThread
                  messages={chat.conversation.messages}
                  agentName={chat.title}
                  busy={chat.busy}
                  onDecision={chat.decideApproval}
                  renderMessageActions={(message) => <AgentMessageActions message={message} />}
                  renderBody={(message, body) =>
                    message.author === 'assistant' ? <AgentAnswer body={body} /> : <p>{body}</p>}
                  onPinnedChange={setPinnedToBottom}
                />
                {!pinnedToBottom && (
                  <button
                    type="button"
                    className="agent-jump-latest"
                    onClick={jumpToLatest}
                  >
                    跳到最新
                  </button>
                )}
                <AgentChatComposer
                  draft={chat.draft}
                  busy={chat.busy}
                  waiting={chat.hasPending}
                  onDraftChange={chat.setDraft}
                  onSend={chat.sendMessage}
                />
              </div>
            </>
          )}
        </main>

        <AgentContextPanel
          open={contextOpen}
          conversation={chat.conversation}
          capabilities={agentCapabilities.capabilities}
          onRefreshCapabilities={inspectCapabilities}
          onClose={() => setContextOpen(false)}
        />
      </div>

      <AgentThreadDrawer
        open={drawerOpen}
        agents={chat.agents}
        conversations={chat.recent}
        activeAgentId={chat.conversation?.agentId ?? chat.selectedAgentId}
        activeConversationId={chat.conversation?.id ?? null}
        onClose={closeDrawer}
        onSelectAgent={chat.selectAgent}
        onResume={chat.resumeConversation}
      />
    </div>
  );
}
