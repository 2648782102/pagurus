# Pagurus v1.8.0 中文发布说明

> 本文件是 Agent Chat `1.8.0` 实时流控制台的中文发布说明。Conchbase 的 `docs/openapi.yaml`、ADR 与 Pagurus 已接受 ADR 仍是契约事实源。

- 版本：Pagurus Agent Chat `1.8.0` 控制台。
- 事实源：Conchbase [ADR 0060](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0060-agent-chat-live-event-stream.md) 与 Pagurus [ADR 0030](decisions/0030-agent-chat-live-stream-console.md)。

## 本次发布

- Agent Chat 门禁升级为 `agentChatContract: "1.8.0"` / `agentChatPaths: 6`。
- 对话进行中优先使用 Runtime 的 SSE 实时流；首帧快照替换当前会话，后续消息按 id 更新。
- SSE 不可用或尚未收到帧时，保留原有轮询作为兼容兜底。
- 工具活动与对话内审批沿用 `1.7.0` 的展示；客户端仍不执行工具、不展示工具参数。
- 断线不会取消任务；重连由 Runtime 的游标机制负责补齐。

## 验证

- `tests/agent-chat-stream-client.test.ts` 覆盖契约门禁、游标 URL、快照解析、非法帧与关闭行为。
- `npm run check`、`npm test`、`npm run build` 通过。

## 边界

SSE 保留策略、多进程 fan-out、压缩、供应商推理文本、工具参数展示、网络工具、可写 MCP 工具、插件宿主与密钥注入仍不在已发布边界内。
