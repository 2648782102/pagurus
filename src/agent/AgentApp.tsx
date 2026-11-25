import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { AgentChatComposer } from '../features/agent-chat/AgentChatComposer.js';
import { BossWorkPanel } from './BossWorkPanel.js';
import { AgentChatThread } from '../features/agent-chat/AgentChatThread.js';
import { Button } from '../shared/ui/primitives.js';
import { consoleSurfaceHref } from '../shared/ui/surface.js';
import { useAgentSurface } from './useAgentSurface.js';
import { AgentChrome } from './AgentChrome.js';
import { useAgentTheme } from './useAgentTheme.js';
import { AgentContextPanel } from './AgentContextPanel.js';
import { AgentAnswer } from './AgentAnswer.js';
import { AgentMessageActions } from './AgentMessageActions.js';
import { ComposerModes } from '../features/agent-chat/ComposerModes.js';
import { AgentPrompt } from './AgentPrompt.js';
import { FirstRunGuide } from './FirstRunGuide.js';
import { AgentDiagnosticsDrawer } from './AgentDiagnosticsDrawer.js';
import { AgentThreadDrawer } from './AgentThreadDrawer.js';
import { useAgentCapabilities } from './useAgentCapabilities.js';
import { conversationTitle } from './agent-surface-model.js';
import { agentErrorText } from './agent-error-text.js';
import { modelName } from '../shared/ui/model-label.js';
import { runtimeNoticeBody } from './RuntimeNoticeBody.js';
import { BossInsightPanel } from './BossInsightPanel.js';

const CONNECTION_LABELS: Readonly<Record<RuntimeConnectionState, string>> = {
  checking: '连接中',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
};

/** Message states in which the reply body is still being appended. */
const STREAMING = new Set(['pending', 'thinking', 'streaming', 'organizing']);

/**
 * Onboarding dismissal lives in memory only.
 *
 * The console must not use browser storage (see the repository guardrails), and
 * a first-run hint is not worth an exception: it reappears on reload, which is
 * the safe default for a guide you can dismiss with one click.
 */

/**
 * The shipped Agent product.
 *
 * The shape is a page, not an application shell: one thin bar, one reading
 * column, one composer. History lives behind a drawer because most visits are
 * "finish a thought", not "manage a library"; the console remains the place to
 * inspect runtime state.
 *
 * one `useAgentChat` controller, the
 * published Agent Chat contract, and a resumed thread that actually has
 * messages.
 */
export function AgentApp() {
  const runtimeStatus = useRuntimeStatus();
  const chat = useAgentSurface(runtimeStatus.runtime);
  const agentCapabilities = useAgentCapabilities();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [firstRunDismissed, setFirstRunDismissed] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const contextButtonRef = useRef<HTMLButtonElement | null>(null);
  const diagnosticsButtonRef = useRef<HTMLButtonElement | null>(null);
  const { theme, toggle: toggleTheme } = useAgentTheme();
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

  /**
   * The context rail is a second column, not a modal, so it does not trap
   * focus. It still has to hand focus back when it closes: the panel's own
   * close button disappears with it, and focus would otherwise fall to <body>,
   * putting the keyboard user back at the top of the page.
   */
  const toggleContext = useCallback(() => {
    setContextOpen((open) => {
      if (!open) inspectCapabilities();
      else contextButtonRef.current?.focus();
      return !open;
    });
  }, [inspectCapabilities]);

  const closeContext = useCallback(() => {
    setContextOpen(false);
    contextButtonRef.current?.focus();
  }, []);

  const toggleDiagnostics = useCallback(() => {
    setDiagnosticsOpen((open) => {
      if (open) diagnosticsButtonRef.current?.focus();
      return !open;
    });
  }, []);

  const closeDiagnostics = useCallback(() => {
    setDiagnosticsOpen(false);
    diagnosticsButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!diagnosticsOpen) return;
    document.querySelector<HTMLElement>('.agent-diagnostics-close')?.focus();
  }, [diagnosticsOpen]);

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
        <header className="agent-chrome">
          <div className="agent-chrome-identity">
            <span className="agent-chrome-mark" aria-hidden="true">P</span>
            <span className="agent-chrome-name">Agent</span>
          </div>
          <div className="agent-chrome-actions">
            <span className="agent-chrome-status" role="status">
              <span className="agent-chrome-dot" aria-hidden="true" />
              {CONNECTION_LABELS[runtimeStatus.state]}
            </span>
            <a className="agent-chrome-link" href={consoleSurfaceHref()}>控制台</a>
          </div>
        </header>
        <div className="agent-blocked">
          {/*
           * Three states, not two. `checking` means the first read has not
           * landed; it used to fall through to "unsupported" and tell the
           * reader to upgrade a Runtime that was merely still answering. The
           * window is short but it is the first thing on screen, and it names
           * the wrong cause.
           */}
          <h1>
            {runtimeStatus.state === 'checking'
              ? '正在连接本机 Runtime'
              : runtimeStatus.state === 'disconnected'
                ? '连不上本机 Runtime'
                : '这个 Runtime 还不支持 Agent 对话'}
          </h1>
          <p>
            {runtimeStatus.state === 'checking'
              ? '正在读取 Runtime 的能力；连上之后这里会自动显示对话。'
              : runtimeStatus.state === 'disconnected'
                ? 'Pagurus 只负责界面，对话需要本机 Runtime 在跑。确认它已启动后点下面的按钮。'
                : 'Runtime 尚未发布 Agent 对话契约。升级 Runtime 之后这里会自动可用。'}
          </p>
          {runtimeStatus.state === 'disconnected' && (
            <p className="agent-blocked-detail">{agentErrorText(runtimeStatus.error, '连接失败')}</p>
          )}
          <div className="agent-blocked-actions">
            {/*
             * `aria-disabled`, not `disabled`: the button stays reachable by
             * keyboard while a reconnect is already under way, and declines
             * the click instead of leaving the tab order.
             */}
            <Button
              variant="primary"
              aria-disabled={runtimeStatus.state === 'checking'}
              onClick={() => {
                if (runtimeStatus.state === 'checking') return;
                void runtimeStatus.refresh();
              }}
            >
              {runtimeStatus.state === 'checking' ? '连接中…' : '重新连接'}
            </Button>
          </div>
        </div>
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
        contextButtonRef={contextButtonRef}
        theme={theme}
        onToggleTheme={toggleTheme}
        diagnosticsOpen={diagnosticsOpen}
        onToggleDiagnostics={toggleDiagnostics}
        diagnosticsButtonRef={diagnosticsButtonRef}
      />

      <div className={`agent-workspace${contextOpen ? ' has-context' : ''}`}>
        {chat.isBoss && chat.conversation !== null && (
          <BossWorkPanel
            runtime={runtimeStatus.runtime}
            messages={chat.conversation.messages}
          />
        )}
        <main className="agent-page">
          {chat.conversation === null ? (
            <div className="agent-page-center">
              <FirstRunGuide
                connection={runtimeStatus.state}
                agents={chat.agents}
                models={chat.models}
                dismissed={firstRunDismissed}
                onDismiss={() => setFirstRunDismissed(true)}
                onUseExample={(text) => {
                  chat.setDraft(text);
                  setFirstRunDismissed(true);
                }}
                onOpenDiagnostics={toggleDiagnostics}
              />
              <AgentPrompt
                agents={chat.agents}
                selectedAgentId={chat.selectedAgentId}
                models={chat.models}
                selectedModelReference={chat.selectedModelReference}
                reasoningEffort={chat.reasoningEffort}
                permissionLevel={chat.permissionLevel}
                permissionOptions={chat.permissionOptions}
                draft={chat.draft}
                busy={chat.busy}
                error={chat.error}
                onSelectAgent={chat.selectAgent}
                onSelectModel={chat.setSelectedModelReference}
                onSelectEffort={chat.setReasoningEffort}
                onSelectPermission={chat.setPermissionLevel}
                onDraftChange={chat.setDraft}
                onSubmit={chat.startAndSend}
              />
            </div>
          ) : (
            <>
              {chat.error && (
                <div className="agent-inline-error anim-rise-tight" role="alert">
                  {agentErrorText(new Error(chat.error), '这条消息没有发出去，请再试一次。')}
                </div>
              )}

              {/*
               * Only while a reply is pending and the live stream is not
               * carrying it. Silent otherwise: a healthy stream needs no
               * banner, and a finished reply has nothing to reconnect.
               */}
              {chat.hasPending && (!chat.streamConnected || chat.streamStalled) && (
                <p className="agent-stream-note" role="status">
                  {chat.streamConnected
                    ? '实时更新停了一会儿，已改用轮询同步。'
                    : `正在重连实时更新（第 ${chat.streamAttempt} 次），期间用轮询同步。`}
                </p>
              )}

              <div className="agent-thread-area">
                <AgentChatThread
                  messages={chat.conversation.messages}
                  agentName={chat.title}
                  busy={chat.busy}
                  onDecision={chat.decideApproval}
                  renderMessageActions={(message) => <AgentMessageActions message={message} />}
                  /*
                   * The model that produced each reply, shown only when it is
                   * known. A message written before replies recorded their
                   * model shows nothing rather than the conversation's current
                   * one, which would be a claim about a turn it never saw.
                   */
                  renderModelNote={(message) => {
                    if (message.author !== 'assistant') return null;
                    const reference = message.modelReference ?? null;
                    if (reference === null) return null;
                    return <span className="agent-chat-message-model">{modelName(reference, chat.models)}</span>;
                  }}
                  renderBody={(message, body) =>
                  message.author === 'assistant'
                    ? <AgentAnswer body={body} streaming={STREAMING.has(message.state)} />
                    : message.author === 'runtime'
                      ? runtimeNoticeBody(body)
                    : <p>{body}</p>}
                  onPinnedChange={setPinnedToBottom}
                  /*
                   * Pinned inside the message column, not beside the composer:
                   * the column ends where the composer begins, so the control
                   * cannot end up underneath a draft that grew past one line.
                   */
                  overlay={!pinnedToBottom ? (
                    <button
                      type="button"
                      className="agent-jump-latest"
                      onClick={jumpToLatest}
                    >
                      跳到最新
                    </button>
                  ) : null}
                />
                <AgentChatComposer
                  draft={chat.draft}
                  busy={chat.busy}
                  waiting={chat.hasPending}
                  onDraftChange={chat.setDraft}
                  onSend={chat.sendMessage}
                  /* Only an empty thread: a resumed one is being read. */
                  autoFocus={chat.conversation.messages.length === 0}
                >
                  <ComposerModes
                    model={chat.modelDraft.length > 0
                      ? chat.modelDraft
                      : `${chat.conversation.providerId}:${chat.conversation.modelId}`}
                    models={chat.models}
                    effort={chat.effortDraft}
                    levels={chat.effortLevels}
                    onChangeModel={(model) => chat.selectModel(model.reference)}
                    onEffortChange={chat.setEffortDraft}
                  />
                </AgentChatComposer>
              </div>
            </>
          )}
        </main>

        {chat.isBoss && chat.conversation !== null && (
          <BossInsightPanel messages={chat.conversation.messages} />
        )}

        <AgentContextPanel
          open={contextOpen}
          conversation={chat.conversation}
          capabilities={agentCapabilities.capabilities}
          onRefreshCapabilities={inspectCapabilities}
          onClose={closeContext}
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

      <AgentDiagnosticsDrawer
        open={diagnosticsOpen}
        runtime={runtimeStatus.runtime}
        onClose={closeDiagnostics}
      />
    </div>
  );
}
