# 寄居蟹 1.3.0 中文发布说明

> 本文件是隔离执行控制台 `1.3.0` 的中文发布说明。契约事实源仍是 Conchbase `docs/openapi.yaml`、已接受 ADR 与两仓 `PROJECT_STATUS.json`。

## 发布范围

- Pagurus [ADR 0021](decisions/0021-isolated-execution-console-v2.md) 连接 Conchbase [ADR 0044](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0044-isolated-local-execution-v2.md) 的 additive execution run 契约。
- 在既有「受控执行」工作区中新增隔离执行 Runs、Run 审计事件与显式 start/cancel/recover 操作。

## 本次发布内容

- typed execution-run client 显式校验 adapter、run、run envelope 与 run event page schema。
- 界面显式区分 queued/running/succeeded/failed/cancelled/interrupted，展示 attempt、expected version、exit code、result/error digest 与 run 事件。
- 所有 expected version 来自 Runtime published facts；`409` 冲突可见，不做本地乐观权限修正。
- 不展示 raw arguments、明文密钥、本地路径、URL、任意命令或 generic secret resolver。
- `1.2.0` fake executor 仍可用；`1.3.0` run 明确标注为 Runtime 拥有的隔离子进程、封闭确定性操作、无外部写入。

## 明确不包含

- 真实 MCP/Skill/plugin 生命周期与任意宿主工具执行。
- 外部 Source、外部 Outbox 写入、外部系统副作用与生产 executor isolation。
- 跨进程 SecretHandle 密钥托管与生产远程配对 UX。

## 验证

- Pagurus 100 tests，Conchbase 160 tests；双仓 `npm run check && npm test && npm run build` 通过。
- `tests/execution-run-api.test.ts` 覆盖 typed client 与 discovery gating；`tests/execution-console.test.tsx` 覆盖 run 面板、run 事件和 published-state-only 边界。

> 本文件描述当前仓库事实，不替代英文契约文档。
