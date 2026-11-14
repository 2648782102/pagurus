import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAgentChatConversation,
  getAgentChatConversation,
  isBossAgent,
  listAgentChatAgents,
  postAgentChatMessage,
  supportsAgentChat,
  type AgentChatAgent,
  type AgentChatConversation,
} from '../../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

interface AgentChatPanelProps {
  readonly runtime: RuntimeInfo | null;
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message.slice(0, 240) : 'Agent 对话失败';
}

export function AgentChatPanel({ runtime }: AgentChatPanelProps) {
  const supported = supportsAgentChat(runtime);
  const [agents, setAgents] = useState<readonly AgentChatAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [conversation, setConversation] = useState<AgentChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const loadAgents = useCallback(async () => {
    if (!supported) return;
    try {
      const list = await listAgentChatAgents();
      setAgents(list.filter((agent) => !agent.archived));
      setSelectedAgentId((current) => current || list.find((agent) => isBossAgent(agent))?.id
        || list.find((agent) => agent.isDefault && !agent.archived)?.id
        || list.find((agent) => !agent.archived)?.id || '');
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [supported]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const refreshConversation = useCallback(async () => {
    if (!conversation) return;
    try {
      setConversation(await getAgentChatConversation(conversation.id));
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [conversation]);

  useEffect(() => {
    if (!conversation || !conversation.messages.some((message) => message.state === 'pending')) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = window.setInterval(() => { void refreshConversation(); }, 700);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [conversation, refreshConversation]);

  const startConversation = useCallback(async () => {
    if (!supported || !selectedAgentId) return;
    setBusy(true);
    setError(null);
    try {
      setConversation(await createAgentChatConversation({ agentId: selectedAgentId }));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [selectedAgentId, supported]);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!conversation || text.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setDraft('');
    try {
      await postAgentChatMessage(conversation.id, {
        text,
        idempotencyKey: `pagurus-chat-${globalThis.crypto.randomUUID()}`,
      });
      setConversation(await getAgentChatConversation(conversation.id));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [busy, conversation, draft]);

  return (
    <section className="work-panel agent-chat-panel" id="agent-chat" aria-labelledby="agent-chat-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AGENT CHAT · 1.5.0</p>
          <h2 id="agent-chat-title">Agent 对话</h2>
        </div>
        <button className="button-secondary" type="button" onClick={loadAgents} disabled={!supported || busy}>
          刷新 Agent
        </button>
      </div>

      <p className="task-note">这里与配置好的 Agent 直接对话；模型、供应商、凭证与路由由用户在 Magpie 中自行配置，Pagurus 和 Conchbase 只走 OpenAI 兼容协议接口。</p>
      {!supported && <div className="work-notice" role="status"><p>当前 Runtime 未发布 <code>agentChatContract: 1.5.0</code>，Agent 对话保持关闭。</p></div>}
      {error && <div className="work-error" role="alert"><p>{error}</p></div>}

      {supported && <>
        <div className="agent-chat-setup">
          <label htmlFor="agent-chat-agent">选择 Agent</label>
          <select id="agent-chat-agent" value={selectedAgentId}
            onChange={(event) => setSelectedAgentId(event.target.value)} disabled={busy}>
            {agents.length === 0 && <option value="">暂无可用 Agent</option>}
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {agent.modelId}{agent.isDefault ? ' · 默认' : ''}
              </option>
            ))}
          </select>
          <button className="button-primary" type="button" onClick={startConversation}
            disabled={busy || selectedAgentId.length === 0}>
            {conversation ? '新建会话' : '开始对话'}
          </button>
        </div>

        {conversation && <>
          {conversation.agentId === 'boss-agent' && (
            <div className="work-notice" role="status">
              <p>老板 Agent 是 Runtime 拥有的组织编排入口：提交意图后由 Conchbase 校验、创建项目/员工、返回结构化汇报与 Attention；它不是普通用户可编辑 Agent profile。</p>
            </div>
          )}
          <dl className="history-detail-grid agent-chat-pins">
            <div><dt>Agent revision</dt><dd><code>{conversation.agentRevisionId}</code></dd></div>
            <div><dt>Model</dt><dd><code>{conversation.providerId}:{conversation.modelId}</code></dd></div>
            <div><dt>Configuration</dt><dd><code>{conversation.configurationRevisionId}</code></dd></div>
            <div><dt>Conversation</dt><dd><code>{conversation.id}</code></dd></div>
          </dl>
          <div className="agent-chat-thread" aria-live="polite" aria-label="Agent 对话消息">
            {conversation.messages.length === 0 && <p className="task-hint">发送第一条消息，Runtime 会创建 Agent-backed task 并等待模型回复。</p>}
            {conversation.messages.map((message) => (
              <article className={`agent-chat-message agent-chat-message-${message.author}`} key={message.id}>
                <header>
                  <strong>{message.author === 'user' ? '你' : message.author === 'assistant' ? 'Agent' : 'Runtime'}</strong>
                  <span>{message.state}</span><code>#{message.sequence}</code>
                </header>
                <p>{message.body || (message.state === 'pending' ? '正在等待模型回复…' : '')}</p>
                {message.error && <small>{message.error}</small>}
              </article>
            ))}
          </div>
          <form className="agent-chat-composer" onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}>
            <label htmlFor="agent-chat-message">给 Agent 发消息</label>
            <textarea id="agent-chat-message" rows={3} value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="例如：请简单介绍一下你自己。" disabled={busy} />
            <div className="agent-chat-composer-actions">
              <button className="button-primary" type="submit" disabled={busy || draft.trim().length === 0}>
                {busy ? '发送中…' : '发送'}
              </button>
              <button className="button-secondary" type="button" onClick={refreshConversation}
                disabled={busy || !conversation.messages.some((message) => message.state === 'pending')}>
                刷新回复
              </button>
            </div>
          </form>
        </>}
      </>}
    </section>
  );
}
