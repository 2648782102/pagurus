# 目标模式：AI 接手说明

> 本文是中文阅读入口，不是契约事实源。英文仓库文档、Conchbase `docs/openapi.yaml`、已接受的 ADR 与 `docs/PROJECT_STATUS.json` 共同描述当前事实；本文不新增 API、schema 或产品边界。

## 最终目标状态

寄居蟹 Pagurus 的 `1.0.0` 已与海螺 Conchbase 的精确 47 条 OpenAPI 路径配对闭环，并成为组织控制台的执行底座。Pagurus 是可选控制客户端：可以管理 Agent profile 与不可变版本、编辑独立全局配置、查看任务历史、控制持久工作、记录能力元数据，并一次性提交只写 SecretHandle value。海螺拥有执行、身份、任务、状态、密钥和权限；Pagurus 不读写私有数据库，也不定义第二套 schema。

当前最终客户端目标已提升为**完整 Organization Console**：单一主会话、attention-first 概览、项目树、员工/委派检查器、结构化报告与归档视图。用户仍然只跟一个入口 Agent 对话，不维护多个 worker 会话。Pagurus 只展示 Conchbase 已发布的组织状态，并提交有界命令。

完整运行时目标见海螺 [Organization Runtime 最终目标规格](https://github.com/2648782102/conchbase/blob/main/docs/ORGANIZATION_RUNTIME_TARGET.zh-CN.md)。客户端方向由 [ADR 0015](decisions/0015-organization-console-direction.md) 接受，交付边界由 [ADR 0016](decisions/0016-organization-console-delivery-boundary.md) 接受，配对公开契约边界由 [ADR 0017](decisions/0017-organization-console-public-contract-boundary.md) 接受。三者现在已落成连接 `1.1.0` 已发布 Runtime 状态的 typed client 与组织控制台；完整组织运行时仍未实现。

[ADR 0013](decisions/0013-console-workspace-navigation.md) 把已实现界面组织为七个 hash 工作区；这是不改变公开契约的控制台壳层，不是新功能或新 API。未来组织的界面落点必须由后续配对 ADR 决定。

本轮「目标模式」不重开 `1.0.0`，也不把待定能力伪装成已实现功能。接手模型立即需要：

- 机器可读现状：[`docs/PROJECT_STATUS.json`](PROJECT_STATUS.json)。
- 开发边界决策：[ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md)。
- 已接受客户端契约：[ADR 0010](decisions/0010-final-local-first-client.md)。
- Runtime 契约事实源：[Conchbase OpenAPI](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml) 与 [ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md)。
- 验证范围：[`docs/VALIDATION_PLAN.md`](VALIDATION_PLAN.md)。
- 远期客户端方向：[ADR 0015](decisions/0015-organization-console-direction.md)、[ADR 0016](decisions/0016-organization-console-delivery-boundary.md) 与 [ADR 0017](decisions/0017-organization-console-public-contract-boundary.md)。

## 立刻能做什么

[ADR 0014](decisions/0014-interface-validation-boundary.md) 已把两个可直接推进的验证切片闭合为可执行夹具：`tests/interface-validation.test.tsx` 覆盖键盘导航、可见焦点、减弱动效与窄/宽视口规则；`tests/published-contract.test.ts` 在配对的 Conchbase 本地检出存在时，对 typed-client 路径、方法和响应 envelope 与 47 条 OpenAPI 做一致性检查。两者记录在 `docs/PROJECT_STATUS.json` 的 `validationEvidence` 中，不生成第二套 schema，也不是真实浏览器无障碍审计。

目前 `nextBoundedSlices` 为空。配对客户端 ADR 0017、Conchbase 的 `1.1.0` 组织路由与双仓夹具已经闭合；组织 UI 只展示已发布 Runtime 状态，不把 mock 当作 live。更深层的真实模型意图解析、动态 Agent revision 创建和完整调度仍属于 Conchbase 的独立门控方向。

每项工作都要按 `docs/PROJECT_STATUS.json` 的 `aiEntry.requiredOrder` 阅读：先读 `AGENTS.md`、`docs/AI_HANDOFF.md`、机器可读状态和本文，再读 `docs/AI_DEVELOPMENT.md`，然后按 `docs/AI_HANDOFF.md` 的阅读顺序进入英文契约文档。完成后运行 `npm run check`、`npm test`、`npm run build`，并同步更新受影响文档。

## 必须先立 ADR 才能做什么

- 工具请求/审批 UI；台账决策本身不是执行许可。
- 可视化组合编辑器；不得把某个拓扑画成唯一支持形状。
- 可执行 MCP/Skill/plugin 安装、启用、授权与生命周期。
- SSE、实时历史、服务端任务分页、生产远程配对 UX、桌面打包与云部署。
- 从未经单独接受的 schema 生成客户端类型。
- OS keychain、稳定跨进程密钥与可重放静态加密值。
- 超出已连接 `1.1.0` 发布状态界面的真实模型意图解析、动态 Agent revision 创建、archive/offboard/resume 控制以及完整组织调度。

这些方向在 `docs/PROJECT_STATUS.json` 中一律标为 `blockedDirections`，且 `requiresAcceptedAdr` 为 `true`。需要新 Runtime 操作时，必须先在 Conchbase 定义并接受契约，再在 Pagurus 接受配套客户端 ADR。

## 辩证取舍

过去选择「接手就绪度」而不是新增一个看起来有用的面板，是因为 Pagurus 的风险来自越过客户端边界：读私有状态、发明第二套 schema、把配置记录当成授权、让明文回到浏览器，或在 Conchbase 尚无契约时调用新写入路径。现在远期目标已经明确为 Organization Console，风险更具体地变成“提前猜 API 并把它做成既成事实”。因此先固定交付边界和验证矩阵，再等待 Runtime 公开契约，是比抢先做 UI 更可靠的方式。

## 不变量

- 只使用已发布 Runtime API；所有响应在 typed-client 边界校验。
- UI 不读取或写入 Conchbase 私有文件与数据库。
- 凭证、SecretHandle 明文和 Runtime 状态不进入浏览器存储、前端 bundle、URL、日志、错误或模型上下文。
- 每个最终界面按已发布 Runtime capability 门禁。
- 不建立第二套 Agent/task/work/configuration/SecretHandle schema。
- 已实现、验证证据、待决方向三类事实绝不混写。
- 一个主会话不等于多个用户会话；ProjectThread 不是第二个用户会话。
- 模型隐喻不是机器状态；HR/员工不是 UI role enum。
- mock 与 fixture 绝不能呈现为 live Runtime 状态。

> 本文件由 [ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md) 接受为开发边界资料，并由 [ADR 0015](decisions/0015-organization-console-direction.md)、[ADR 0016](decisions/0016-organization-console-delivery-boundary.md) 与 [ADR 0017](decisions/0017-organization-console-public-contract-boundary.md) 提升到完整 Organization Console 目标；它不是新客户端或 Runtime API 契约，也不使任何 `blockedDirections` 成为已实现行为。
