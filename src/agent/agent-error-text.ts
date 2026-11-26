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

  // Runtime classifies provider failures (src/runtime/model-provider.ts) and
  // publishes the kind in the message. Each kind has a different owner and a
  // different next step, so they must not collapse into one "try again".
  if (/authentication/i.test(raw)) {
    return 'provider 拒绝了凭据。检查 Runtime 里的 provider 配置（密钥或网关地址），然后重试。';
  }
  if (/rate-limit/i.test(raw)) {
    return 'provider 正在限流。等一会儿再发，或换一个模型。';
  }
  if (/context-limit/i.test(raw)) {
    return '这次内容超出了模型上下文。缩短消息，或开一个新对话。';
  }
  if (/upstream-failure/i.test(raw)) {
    return 'provider 上游出错。稍后重试；持续失败就检查网关状态。';
  }

  const status = /HTTP\s(\d{3})/.exec(raw)?.[1];
  if (status === '503' || status === '502') {
    return 'Runtime 暂时不可用。稍等一会儿再试；如果一直这样，打开菜单看看运行时状态。';
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
    return `Runtime 返回了一个错误（${status}）。可以再试一次，或打开菜单查看详情。`;
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
