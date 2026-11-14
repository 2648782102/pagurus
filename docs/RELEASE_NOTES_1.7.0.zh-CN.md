# Pagurus v1.7.0 中文发布说明

> 本文件是 Agent Chat `1.7.0` 控制台的中文发布说明。Conchbase 的 `docs/openapi.yaml`、ADR 与 Pagurus 已接受 ADR 仍是契约事实源。

- 版本：Pagurus Agent Chat `1.7.0` 控制台。
- 事实源：Conchbase [ADR 0059](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0059-agent-chat-tool-projection.md) 与 Pagurus [ADR 0029](decisions/0029-agent-chat-tool-approval-console.md)。

## 本次发布

- Agent Chat 门禁升级为 `agentChatContract: "1.7.0"` / `agentChatPaths: 5`。
- 助手消息展示 Runtime 投影的轮次、工具、审批与输出活动，不展示工具参数或文件内容。
- 新增 `waiting_approval` 状态与对话内「批准并继续 / 拒绝」按钮；决策只发给 Runtime，客户端不执行工具、不本地推断审批状态。
- 审批后刷新会话，继续展示同一任务后续的思考、流式输出与最终回复。

## 验证

- `tests/agent-chat-panel.test.tsx` 覆盖工具活动、等待审批文案与两种决策回调。
- `tests/agent-chat-api.test.ts` 覆盖 `1.7.0` 门禁与五条路径。
- `npm run check`、`npm test` 通过。

## 边界

SSE、供应商推理文本、工具参数展示、网络工具、可写 MCP 工具、插件宿主与密钥注入仍不在已发布边界内。
