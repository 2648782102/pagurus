/**
 * Turns a transport error into something a person can act on.
 *
 * The API layer deliberately keeps technical language ("Runtime returned HTTP
 * 503") so an operator can diagnose it. A shipped product should not show that
 * sentence, but it also must not pretend nothing failed: each case below says
 * what happened and what the reader can do next.
 */
export function agentErrorText(cause: unknown, fallback: string): string {
  const raw = cause instanceof Error ? cause.message : '';

  const status = /HTTP\s(\d{3})/.exec(raw)?.[1];
  if (status === '503' || status === '502') {
    return 'Runtime 暂时不可用。稍等一会儿再试；如果一直这样，打开控制台看看运行时状态。';
  }
  if (status === '429') {
    return '请求太频繁，被限流了。等几秒再发一次。';
  }
  if (status === '404') {
    return '这段对话已经不存在了，可能是被清理或归档了。可以开始一个新对话。';
  }
  if (status === '401' || status === '403') {
    return '这次请求没有通过 Runtime 的校验。如果是工具操作，需要先在对话里批准。';
  }
  if (status !== undefined) {
    return `Runtime 返回了一个错误（${status}）。可以再试一次，或打开控制台查看详情。`;
  }

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return '连接不上本机 Runtime。确认它还在运行，然后重试。';
  }
  if (/abort/i.test(raw)) {
    return '请求被取消了。';
  }
  if (raw.length > 0 && !/returned an invalid/i.test(raw)) {
    return raw.slice(0, 240);
  }
  return fallback;
}
