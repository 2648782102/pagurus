# 目标模式：AI 接手说明

> 本文是中文阅读入口，不是契约事实源。英文仓库文档、Conchbase `docs/openapi.yaml`、已接受的 ADR 与 `docs/PROJECT_STATUS.json` 共同描述当前事实；本文不新增 API、schema 或产品边界。

## 最终目标状态

寄居蟹 Pagurus 的 `1.0.0` 已与海螺 Conchbase 的精确 47 条 OpenAPI 路径配对闭环。Pagurus 是可选控制客户端：可以管理 Agent profile 与不可变版本、编辑独立全局配置、查看任务历史、控制持久工作、记录能力元数据，并一次性提交只写 SecretHandle value。海螺拥有执行、身份、任务、状态、密钥和权限；Pagurus 不读写私有数据库，也不定义第二套 schema。

[ADR 0013](decisions/0013-console-workspace-navigation.md) 把已实现界面组织为七个 hash 工作区；这是不改变公开契约的控制台壳层，不是新功能或新 API。

本轮「目标模式」不重开 `1.0.0`，也不把待定能力伪装成已实现功能。接手模型立即需要：

- 机器可读现状：[`docs/PROJECT_STATUS.json`](PROJECT_STATUS.json)。
- 开发边界决策：[ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md)。
- 已接受客户端契约：[ADR 0010](decisions/0010-final-local-first-client.md)。
- Runtime 契约事实源：[Conchbase OpenAPI](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml) 与 [ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md)。
- 验证范围：[`docs/VALIDATION_PLAN.md`](VALIDATION_PLAN.md)。

## 立刻能做什么

[ADR 0014](decisions/0014-interface-validation-boundary.md) 已把两个可直接推进的验证切片闭合为可执行夹具：`tests/interface-validation.test.tsx` 覆盖键盘导航、可见焦点、减弱动效与窄/宽视口规则；`tests/published-contract.test.ts` 在配对的 Conchbase 本地检出存在时，对 typed-client 路径、方法和响应 envelope 与 47 条 OpenAPI 做一致性检查。两者记录在 `docs/PROJECT_STATUS.json` 的 `validationEvidence` 中，不生成第二套 schema，也不是真实浏览器无障碍审计。

目前 `nextBoundedSlices` 为空。新的有界工作必须先由已接受 ADR 定义，再写入机器可读状态。

每项工作都要按 `docs/PROJECT_STATUS.json` 的 `aiEntry.requiredOrder` 阅读：先读 `AGENTS.md`、`docs/AI_HANDOFF.md`、机器可读状态和本文，再读 `docs/AI_DEVELOPMENT.md`，然后按 `docs/AI_HANDOFF.md` 的阅读顺序进入英文契约文档。完成后运行 `npm run check`、`npm test`、`npm run build`，并同步更新受影响文档。

## 必须先立 ADR 才能做什么

- 工具请求/审批 UI；台账决策本身不是执行许可。
- 可视化组合编辑器；不得把某个拓扑画成唯一支持形状。
- 可执行 MCP/Skill/plugin 安装、启用、授权与生命周期。
- SSE、实时历史、服务端任务分页、生产远程配对 UX、桌面打包与云部署。
- 从未经单独接受的 schema 生成客户端类型。
- OS keychain、稳定跨进程密钥与可重放静态加密值。

这些方向在 `docs/PROJECT_STATUS.json` 中一律标为 `blockedDirections`，且 `requiresAcceptedAdr` 为 `true`。需要新 Runtime 操作时，必须先在 Conchbase 定义并接受契约，再在 Pagurus 接受配套客户端 ADR。

## 辩证取舍

选择「接手就绪度」而不是新增一个看起来有用的面板，是因为 Pagurus 的风险来自越过客户端边界：读私有状态、发明第二套 schema、把配置记录当成授权、让明文回到浏览器，或在 Conchbase 尚无契约时调用新写入路径。把状态、验证证据和待决方向分离，并让 guardrails 可执行检查，能让下一步开发明确且不会破坏 `1.0.0`。

## 不变量

- 只使用已发布 Runtime API；所有响应在 typed-client 边界校验。
- UI 不读取或写入 Conchbase 私有文件与数据库。
- 凭证、SecretHandle 明文和 Runtime 状态不进入浏览器存储、前端 bundle、URL、日志、错误或模型上下文。
- 每个最终界面按已发布 Runtime capability 门禁。
- 不建立第二套 Agent/task/work/configuration/SecretHandle schema。
- 已实现、验证证据、待决方向三类事实绝不混写。

> 本文件由 [ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md) 接受为开发边界资料；它不是新客户端或 Runtime API 契约，也不使任何 `blockedDirections` 成为已实现行为。
