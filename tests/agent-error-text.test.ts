import { describe, expect, it } from 'vitest';
import { agentErrorText } from '../src/agent/agent-error-text.js';

describe('agent error copy', () => {
  it('explains an unavailable runtime without quoting HTTP jargon', () => {
    const text = agentErrorText(new Error('Runtime returned HTTP 503'), 'fallback');
    expect(text).toContain('暂时不可用');
    expect(text).not.toMatch(/HTTP|503/);
  });

  it('names rate limiting and what to do', () => {
    expect(agentErrorText(new Error('Runtime returned HTTP 429'), 'x')).toContain('限流');
  });

  it('explains a conversation that no longer exists', () => {
    expect(agentErrorText(new Error('Runtime returned HTTP 404'), 'x')).toContain('不存在');
  });

  it('keeps an unknown status actionable rather than silent', () => {
    const text = agentErrorText(new Error('Runtime returned HTTP 500'), 'x');
    expect(text).toContain('500');
    expect(text).toContain('再试一次');
  });

  it('recognises a network failure', () => {
    expect(agentErrorText(new Error('Failed to fetch'), 'x')).toContain('连接不上');
  });

  it('sends a provider authentication failure to the provider settings, not to retry', () => {
    const text = agentErrorText(new Error('provider failure: authentication'), 'x');
    expect(text).toContain('凭据');
    expect(text).toContain('provider 配置');
  });

  it('tells the reader to shorten input when the context limit was hit', () => {
    const text = agentErrorText(new Error('provider failure: context-limit'), 'x');
    expect(text).toContain('上下文');
    expect(text).toMatch(/缩短|新对话/);
  });

  it('keeps an upstream failure distinct from a local runtime outage', () => {
    const text = agentErrorText(new Error('provider failure: upstream-failure'), 'x');
    expect(text).toContain('上游');
  });

  it('falls back for a non-error value', () => {
    expect(agentErrorText('nope', '默认提示')).toBe('默认提示');
  });

  it('passes through a domain message that is already human', () => {
    expect(agentErrorText(new Error('模型目录暂不可用'), 'x')).toBe('模型目录暂不可用');
  });
});
