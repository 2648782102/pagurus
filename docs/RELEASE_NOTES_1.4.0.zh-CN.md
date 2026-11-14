# Pagurus v1.4.0 中文发布说明

> 本文件是主会话对话控制台 `1.4.0` 的中文发布说明。英文仓库文档、Conchbase `docs/openapi.yaml`、已接受的 ADR 与 `docs/PROJECT_STATUS.json` 仍是契约事实源；本文件不另立 schema 或 API。

- 版本：Pagurus 连接 Conchbase additive `1.4.0` 主会话投影契约。
- 事实源：[ADR 0022](decisions/0022-primary-conversation-console.md)、Conchbase [ADR 0045](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0045-primary-conversation-projection.md) 与 [Conchbase OpenAPI](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml)。

## 本次发布

- 组织主会话页顶部新增完整对话栏：用户消息、老板回执、员工活动、结构化汇报、Attention 与执行状态按 Runtime published sequence 排列。
- 输入框采用类似 Codex 对话栏的固定 composer，支持发送、pending 状态说明与自动刷新；消息只从 Runtime 发布事实读取，不在浏览器伪造 transcript。
- 开放 Attention 消息可直接回答或撤回；仍使用 Runtime 发布的 `expectedVersion`，stale `/` HTTP 错误以可见错误呈现。
- 旧项目、委派、员工、报告、工作项与时间线卡片保留为辅助详情。
- 未发布 `conversationContract: 1.4.0` 的 Runtime 会显示不支持提示，并保留 `1.1.0` 组织状态卡片。

## 验证

- `tests/conversation-api.test.ts` 覆盖 typed client、发现门禁、cursor 与消息 envelope。
- `tests/conversation-panel.test.tsx` 覆盖完整对话栏、发布消息、Attention 操作、composer 与不支持 Runtime 回退。
- 双仓 `npm run check`、`npm test`、`npm run build` 通过；中文文档随发布一并更新。

## 边界

Pagurus 不读写私有数据库、不计算授权、不暴露模型原始 transcript、不新增可写消息 API。持久化消息撰写、附件、供应商 transcript 流与多会话聊天仍需要两个仓库分别接受新 ADR。
