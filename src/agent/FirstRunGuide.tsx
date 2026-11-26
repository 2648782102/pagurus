import type { AgentChatAgent, AgentChatModel } from '../shared/api/agent-chat.js';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';

export interface FirstRunGuideProps {
  readonly connection: RuntimeConnectionState;
  readonly agents: readonly AgentChatAgent[];
  readonly models: readonly AgentChatModel[];
  readonly dismissed: boolean;
  readonly onDismiss: () => void;
  readonly onUseExample: (text: string) => void;
  readonly onOpenDiagnostics: () => void;
}

type StepState = 'done' | 'todo' | 'blocked';

interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  readonly hint: string;
}

const EXAMPLE = '用三句话介绍一下你能做什么，并给出一个你建议我先完成的小任务。';

/**
 * First-run guide.
 *
 * A new person lands on an empty prompt with no idea whether the Runtime is up,
 * whether a model is available, or what to type. This shows the three
 * preconditions with their real state (never a fake "all good"), then offers
 * one example they can send without thinking.
 *
 * It is dismissible and remembers nothing on the server: it is onboarding, not
 * product state.
 */
export function FirstRunGuide({
  connection,
  agents,
  models,
  dismissed,
  onDismiss,
  onUseExample,
  onOpenDiagnostics,
}: FirstRunGuideProps) {
  if (dismissed) return null;

  const steps: readonly Step[] = [
    {
      id: 'runtime',
      label: '本机 Runtime',
      state: connection === 'connected' ? 'done' : connection === 'checking' ? 'todo' : 'blocked',
      hint: connection === 'connected'
        ? '已连接'
        : connection === 'checking'
          ? '正在检查…'
          : '没有连上；先启动 Conchbase，再点右上角重新连接',
    },
    {
      id: 'model',
      label: '可用模型',
      state: models.length > 0 ? 'done' : 'blocked',
      hint: models.length > 0
        ? `可用 ${models.length} 个，已自动选好一个`
        : 'Runtime 没有返回模型；打开菜单里的「模型」分区检查 provider',
    },
    {
      id: 'agent',
      label: '对话 Agent',
      state: agents.length > 0 ? 'done' : 'blocked',
      hint: agents.length > 0
        ? `已选 ${agents[0]?.name ?? '第一个 Agent'}`
        : '还没有可用 Agent；可以在菜单里创建一个',
    },
  ];

  const ready = steps.every((step) => step.state === 'done');

  return (
    <aside className="agent-first-run" aria-labelledby="first-run-title">
      <div className="agent-first-run-head">
        <h2 id="first-run-title">第一次使用</h2>
        <button type="button" className="agent-first-run-dismiss" onClick={onDismiss} aria-label="关闭使用引导">
          跳过
        </button>
      </div>
      <ol className="agent-first-run-steps">
        {steps.map((step) => (
          <li key={step.id} className={`agent-first-run-step is-${step.state}`}>
            <span className="agent-first-run-mark" aria-hidden="true">
              {step.state === 'done' ? '✓' : step.state === 'blocked' ? '!' : '·'}
            </span>
            <span className="agent-first-run-label">{step.label}</span>
            <span className="agent-first-run-hint">{step.hint}</span>
          </li>
        ))}
      </ol>
      {!ready && (
        <div className="agent-first-run-recovery">
          <button type="button" onClick={onOpenDiagnostics}>查看诊断</button>
          <span>连接、模型或 Agent 没准备好时，先看具体检查结果。</span>
        </div>
      )}
      {ready && (
        <div className="agent-first-run-example">
          <p>{EXAMPLE}</p>
          <button type="button" onClick={() => onUseExample(EXAMPLE)}>用这条开始</button>
        </div>
      )}
    </aside>
  );
}
