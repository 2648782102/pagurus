# Pagurus v1.5.0 中文发布说明

> 本文件是独立 Agent 对话工作区 `1.5.0` 的中文发布说明。英文仓库文档、Conchbase `docs/openapi.yaml`、已接受的 ADR 与 `docs/PROJECT_STATUS.json` 仍是契约事实源；本文件不另立 schema 或 API。

- 版本：Pagurus 连接 Conchbase additive `1.5.0` Agent Chat 契约。
- 事实源：[ADR 0023](decisions/0023-agent-chat-console.md)、Conchbase [ADR 0046](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0046-agent-chat-module.md) 与 [Conchbase OpenAPI](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml)。

## 本次发布

- 左侧导航新增独立「Agent 对话」工作区，不复用组织主会话面板。
- 可选择配置好的 Agent、显示固定 Agent revision / model / configuration revision、创建会话、发送用户消息、轮询 pending 回复，并展示 succeeded/failed/cancelled 状态。
- Runtime 通过现有 Agent-backed task 调用模型；用户可在 Magpie 自行配置模型、供应商、凭证、路由与 app key。Pagurus 不接触上游凭证，不直接调用模型供应商。
- 组织主会话仍是 Boss 编排事实投影；Agent 对话是普通配置 Agent 的一问一答，两者产品语义明确分离。
- 未发布 `agentChatContract: 1.5.0` 的 Runtime 只显示 bounded 不支持提示。

## 验证

- `tests/agent-chat-api.test.ts` 覆盖 typed client、发现字段、四条路径、会话创建/读取与消息提交。
- `tests/agent-chat-panel.test.tsx` 覆盖 Agent 选择、创建对话、发送消息、模型回复渲染与 unsupported fallback。
- 双仓 `npm run check`、`npm test`、`npm run build` 通过；中文文档随发布一并更新。

## 边界

Pagurus 不读写私有数据库、不计算授权、不暴露 SecretHandle 明文、不直接调用供应商，也不把本地乐观消息伪装成 Runtime published state。多轮记忆策略、附件、流式 transcript 与工具执行仍需要单独已接受 ADR。
