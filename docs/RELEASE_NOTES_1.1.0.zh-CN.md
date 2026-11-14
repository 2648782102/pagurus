# 寄居蟹 / 海螺 1.1.0 中文发布说明

> 本文件是 Boss Mode `1.1.0` 配套控制台的中文发布说明。英文仓库文档、Conchbase `docs/openapi.yaml`、已接受的 ADR 与 `docs/PROJECT_STATUS.json` 仍是契约事实源；本文件不新增 API、schema 或产品边界。

## 发布范围

- 项目：寄居蟹 Pagurus（可选控制台）与海螺 Conchbase（Agent Runtime）。
- 版本：Pagurus 连接 Conchbase additive `1.1.0` 组织公开契约；冻结的 `1.0.0` 47 条路径保持不变。
- 定位：用户仍只有一个主会话入口。Pagurus 只提交有界文本意图、读取 Runtime 已发布组织状态、按 published version 回答或撤回 Attention；不计算组织授权，不维护第二套状态。
- 事实源：Pagurus [ADR 0018](decisions/0018-boss-mode-console-product-loop.md)、Conchbase [ADR 0041](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0041-boss-mode-product-loop.md) 与 [Conchbase OpenAPI](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml)。

## 本次发布内容

- 新增「组织主会话」工作区，提交自然语言意图并显示 Runtime 发布的项目、员工提案、Delegation、WorkItem、报告、Attention 与事件。
- org typed client 明确校验 `1.1.0` 响应 envelope；提交意图只携带 `text` 与 `idempotencyKey`，不再本地推导 `expectedSequence`。
- Attention-first 队列读取 Runtime 发布的 `expectedVersion`，回答/撤回使用该版本；`202` 仅显示“意图已接受”，随后刷新已发布状态。
- Runtime capability 通过可选的 `organizationContract: "1.1.0"` 与 `organizationPaths: 18` 门禁；session 响应不再要求原始 events，事件通过 `/v1/organization/events` 读取。
- 界面保持只读审计边界：不创建 Agent revision、不计算 Delegation 继承、不决定 archive/resume、不读写 Conchbase 私有文件或数据库。
- 双仓 fake-provider live loopback fixture 动态导入 Pagurus typed organization client，覆盖多项目、并发 worker、Attention 回答和归档恢复。

## 本地运行

先启动 Conchbase，再启动 Pagurus：

```sh
# Conchbase
npm ci
npm run dev

# Pagurus
cd pagurus
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173/#organization-console`。若需要真实模型解析主会话意图，在 Conchbase 启动前设置：

```sh
export CONCHBASE_ORGANIZATION_INTENT_MODEL='deepseek/deepseek-flash'
```

未设置时 Conchbase 使用确定性离线解析器。真实供应商凭证仍留在 Magpie/适配器边界，不进入 Pagurus。

## 验证结果

- Pagurus `npm run check && npm test && npm build`：95 个测试通过。
- Conchbase `npm run check && npm test && npm run build`：152 个测试通过。
- 双仓 `organization-e2e` fixture 使用 credential-free fake provider 与真实 loopback HTTP，验证 Pagurus typed client 覆盖完整 Boss-mode 产品闭环。
- 本地 Runtime 验收：Conchbase `npm run validate:boss-local` 对真实开发服务完成主会话意图、published session 与 events 检查；确定性离线模式通过，session 不泄露 raw events。真模型结构化输出一致性仍是独立验证层；一次本机 Magpie 输出因 action type 不合规被 Runtime 正确拒绝，未提交任何组织状态。真实模型输出与凭证不进入仓库。

## 明确不包含

- 真实工具执行、MCP/Skill/plugin 安装与生命周期、宿主执行隔离。
- 真实外部 Source、真实 Outbox 外部写入、外部副作用。
- 跨进程 SecretHandle 密钥托管、生产密钥保险库。
- 生产远程配对 UX、云部署、桌面打包、SSE/保留/重连契约、生成式客户端类型。

这些能力必须在 Conchbase 与 Pagurus 分别接受新 ADR 后才能实现。

## 中文文档

- [中文 README](../README.zh-CN.md)
- [中文快速开始](QUICK_START.zh-CN.md)
- [v1.0.0 中文发布说明](RELEASE_NOTES_1.0.0.zh-CN.md)
- [v1.1.0 中文发布说明](RELEASE_NOTES_1.1.0.zh-CN.md)
- [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)
- [Conchbase v1.1.0 中文发布说明](https://github.com/2648782102/conchbase/blob/main/docs/RELEASE_NOTES_1.1.0.zh-CN.md)

> `v1.0.0` 发布说明作为历史发布快照保持不变；本文件描述当前仓库事实，不替代英文契约文档。
