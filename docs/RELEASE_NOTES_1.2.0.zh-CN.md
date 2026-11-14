# 寄居蟹 1.2.0 中文发布说明

> 本文件是受控执行控制台 `1.2.0` 的中文发布说明。契约事实源仍是 Conchbase `docs/openapi.yaml`、已接受 ADR 与两仓 `PROJECT_STATUS.json`。

## 发布范围

- Pagurus [ADR 0020](decisions/0020-controlled-execution-console-v1.md) 连接 Conchbase [ADR 0043](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0043-controlled-execution-v1.md) 的 additive `1.2.0` 假执行器契约。
- 新增第 9 个工作区「受控执行」，按可选 `executionContract: 1.2.0` 与 `executionPaths: 8` 门禁。

## 本次发布内容

- typed execution client 显式校验 capability、grant、request、event 与 envelope schema。
- 界面明确区分 recorded/enabled/granted/approved/running/succeeded/failed/revoked；能力记录不显示为授权或可执行。
- 通过 published routes 创建显式授权、创建执行请求、批准/拒绝、撤销 grant；expected version 全部来自 Runtime published facts。
- 审计事件与 digest-only 结果只读展示；不接受明文、原始参数、私有路径或泛型 secret resolver。
- `202/201` 写入后刷新 published state；不把本地乐观状态当作 Runtime 事实。

## 明确不包含

- 真实 MCP/Skill/plugin 安装、启用、加载、授权与生命周期。
- 宿主工具执行、外部系统写入、生产 executor isolation、崩溃安全外部副作用。
- 跨进程 SecretHandle 密钥托管与生产远程配对 UX。

## 验证

- Pagurus 98 tests，Conchbase 156 tests；双仓 `npm run check && npm test && npm run build` 通过。
- `tests/execution-api.test.ts` 覆盖 typed client 读写与状态门禁；`tests/execution-console.test.tsx` 覆盖受控执行工作区、状态词汇和 no-authority UI。

> 本文件描述当前仓库事实，不替代英文契约文档。
