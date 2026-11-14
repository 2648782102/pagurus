# 寄居蟹中文快速开始

> 面向中文读者与 AI 编码 Agent 的入口文档。英文 `docs/AI_HANDOFF.md`、`docs/AI_DEVELOPMENT.md`、Conchbase `docs/openapi.yaml` 和 ADR 仍是契约事实源；本文件不另立 schema 或 API。

## 这套项目是什么

寄居蟹 Pagurus 是海螺 Conchbase 的可选本机控制客户端。用户通过它管理 Agent profile 与不可变版本、全局运行时配置、持久工作、能力元数据与只写 SecretHandle。海螺才是执行权威；CLI、IDE 和第三方界面也可以使用同一套版本化 Runtime API。

当前控制台连接 Boss Mode `1.1.0` 组织主会话、受控执行 `1.2.0` 假执行器、隔离执行 `1.3.0` run 面板与主会话对话投影 `1.4.0`：前者从唯一主会话读取项目、员工、报告、Attention 与事件；`1.2.0` 证明完整授权/审批/审计路径；`1.3.0` 展示 Runtime 拥有的隔离子进程 run 状态与恢复；`1.4.0` 把用户消息、Boss 回执、员工活动、结构化汇报与 Attention 组织成 Runtime 发布的完整对话栏。后两者都不执行真实宿主工具或外部写入。

Pagurus 不拥有 Runtime 状态，不读取私有 SQLite 数据库，不定义第二套 Agent/task/work schema，也不把配置记录转换为安装、授权或工具执行。

## 环境与启动

要求 Node.js 24+。先启动 Conchbase，再启动 Pagurus。

在海螺仓库中：

```sh
npm ci
npm run dev
```

在寄居蟹仓库中（另一个终端）：

```sh
npm ci
npm run dev
```

默认访问 `http://127.0.0.1:5173/`，Vite 将 `/v1` 代理到 `http://127.0.0.1:4318`。如需真实模型任务，还要启动本机 Magpie 并在其中启用模型；当前 Magpie 只是兼容适配器，不是唯一未来供应商。Runtime 只监听 loopback；远程连接不是当前默认能力。

控制台左侧提供九个已开放工作区：总览、组织主会话、受控执行、Agent 配置、任务运行、持久工作、能力目录、敏感信息、运行时设置。工作台只渲染当前工作区；`#` 地址用于导航和恢复旧锚点，不保存偏好或 Runtime 状态。详见 [ADR 0013](decisions/0013-console-workspace-navigation.md)、[ADR 0018](decisions/0018-boss-mode-console-product-loop.md)、[ADR 0020](decisions/0020-controlled-execution-console-v1.md) 与 [ADR 0021](decisions/0021-isolated-execution-console-v2.md)。

## 使用边界

- 每个界面按 Conchbase 已发布 capability 门禁：`durable-work-contract`、`asynchronous-work-control`、`local-source-policy`、`capability-directory`、`write-only-secret-handles` 等。
- 组织主会话按可选的 `organizationContract: 1.1.0` 与 `organizationPaths: 18` 门禁；受控执行按 `executionContract: 1.2.0` / `executionPaths: 8`，隔离执行 run 按 `executionRunContract: 1.3.0` / `executionRunPaths: 8`，主会话对话按 `conversationContract: 1.4.0` / `conversationPaths: 2` 门禁。它们都只把文本/显式写请求发给 Runtime，不本地推导权限。
- Agent 版本与全局运行时配置版本分开管理；Agent 任务固定两者及生效 provider/model。
- v2 组合执行器是确定性、拓扑中立的遍历，不代表模型驱动多 Agent 执行。
- 能力目录记录只是配置数据；安装、启用、授权和工具执行仍是不同概念，当前未实现。
- 只写 SecretHandle 的 value 是一次性请求数据，提交后立即清除；界面只看得到 key、元数据、摘要和 `injected`/`denied` 收据，绝不展示明文。
- 明文敏感值不得进入浏览器存储、前端 bundle、URL、日志、错误、客户端状态或模型上下文。

## AI-first 开发顺序

1. 先读根目录 [`AGENTS.md`](../AGENTS.md)，确认 AI-first 原则和产品不变量。
2. 读 [AI 交接说明](AI_HANDOFF.md)，再读 [机器可读项目状态](PROJECT_STATUS.json) 与 [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)，先区分已实现、验证证据与必须先立 ADR 的方向。
3. 读 [开发约定](AI_DEVELOPMENT.md)，并以 `PROJECT_STATUS.json` 的 `aiEntry.requiredOrder` 为准。
4. 读 [架构](ARCHITECTURE.md)、[技术栈](TECH_STACK.md)、[验证计划](VALIDATION_PLAN.md)、[ADR 0010](decisions/0010-final-local-first-client.md)、[ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md)、[ADR 0014](decisions/0014-interface-validation-boundary.md)、[ADR 0015](decisions/0015-organization-console-direction.md)、[ADR 0016](decisions/0016-organization-console-delivery-boundary.md) 与 [ADR 0018](decisions/0018-boss-mode-console-product-loop.md)、[ADR 0020](decisions/0020-controlled-execution-console-v1.md) 与 [ADR 0021](decisions/0021-isolated-execution-console-v2.md)。
5. 在进入组织界面开发前，读海螺[组织运行时最终目标](https://github.com/2648782102/conchbase/blob/main/docs/ORGANIZATION_RUNTIME_TARGET.zh-CN.md) 与 [ADR 0041](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0041-boss-mode-product-loop.md)；组织 UI 只读取已发布 Runtime 状态。
6. 读 Conchbase [ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md)、其冻结的 47 条 `1.0.0` 路径、additive `1.1.0` 组织路径、additive `1.2.0` 受控执行路径与 additive `1.3.0` execution run 路径 OpenAPI 契约。
7. 修改客户端前确认 `src/shared/api/` 的类型校验边界与 `src/features/<capability>/` 的局部状态边界。

每次改动后运行 `npm run check`、`npm test`、`npm run build`，并同步更新受影响文档。需要新 Runtime 操作时，先在 Conchbase 定义并接受契约；不要在客户端静默发明第二套 schema。

## 验证与发布文档

- [中文 README](../README.zh-CN.md)
- [中文发布说明](RELEASE_NOTES_1.0.0.zh-CN.md)
- [v1.1.0 中文发布说明](RELEASE_NOTES_1.1.0.zh-CN.md)
- [v1.2.0 中文发布说明](RELEASE_NOTES_1.2.0.zh-CN.md)
- [v1.3.0 中文发布说明](RELEASE_NOTES_1.3.0.zh-CN.md)
- [v1.4.0 中文发布说明](RELEASE_NOTES_1.4.0.zh-CN.md)
- [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)
- [机器可读项目状态](PROJECT_STATUS.json)
- [英文 README](../README.md)
- [Conchbase 中文快速开始](https://github.com/2648782102/conchbase/blob/main/docs/QUICK_START.zh-CN.md)

`v1.0.0` 是历史发布快照；`v1.1.0` 描述 Boss Mode 组织控制台，`v1.2.0` 描述受控执行控制台 v1，`v1.3.0` 描述隔离执行控制台 v2，`v1.4.0` 描述主会话对话控制台。仓库内的中文文档与 Release notes 保持一致。
