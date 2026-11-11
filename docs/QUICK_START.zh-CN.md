# 寄居蟹中文快速开始

> 面向中文读者与 AI 编码 Agent 的入口文档。英文 `docs/AI_HANDOFF.md`、`docs/AI_DEVELOPMENT.md`、Conchbase `docs/openapi.yaml` 和 ADR 仍是契约事实源；本文件不另立 schema 或 API。

## 这套项目是什么

寄居蟹 Pagurus 是海螺 Conchbase 的可选本机控制客户端。用户通过它管理 Agent profile 与不可变版本、全局运行时配置、持久工作、能力元数据与只写 SecretHandle。海螺才是执行权威；CLI、IDE 和第三方界面也可以使用同一套版本化 Runtime API。

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

## 使用边界

- 每个界面按 Conchbase 已发布 capability 门禁：`durable-work-contract`、`asynchronous-work-control`、`local-source-policy`、`capability-directory`、`write-only-secret-handles` 等。
- Agent 版本与全局运行时配置版本分开管理；Agent 任务固定两者及生效 provider/model。
- v2 组合执行器是确定性、拓扑中立的遍历，不代表模型驱动多 Agent 执行。
- 能力目录记录只是配置数据；安装、启用、授权和工具执行仍是不同概念，当前未实现。
- 只写 SecretHandle 的 value 是一次性请求数据，提交后立即清除；界面只看得到 key、元数据、摘要和 `injected`/`denied` 收据，绝不展示明文。
- 明文敏感值不得进入浏览器存储、前端 bundle、URL、日志、错误、客户端状态或模型上下文。

## AI-first 开发顺序

1. 先读根目录 [`AGENTS.md`](../AGENTS.md)，确认 AI-first 原则和产品不变量。
2. 读 [AI 交接说明](AI_HANDOFF.md)，再读 [开发约定](AI_DEVELOPMENT.md)。
3. 读 [机器可读项目状态](PROJECT_STATUS.json) 与 [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)，先区分已实现、验证证据与必须先立 ADR 的方向。
4. 读 [架构](ARCHITECTURE.md)、[技术栈](TECH_STACK.md)、[验证计划](VALIDATION_PLAN.md)、[ADR 0010](decisions/0010-final-local-first-client.md) 与 [ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md)。
5. 读 Conchbase [ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md) 与其 47 条路径 OpenAPI 契约。
6. 修改客户端前确认 `src/shared/api/` 的类型校验边界与 `src/features/<capability>/` 的局部状态边界。

每次改动后运行 `npm run check`、`npm test`、`npm run build`，并同步更新受影响文档。需要新 Runtime 操作时，先在 Conchbase 定义并接受契约；不要在客户端静默发明第二套 schema。

## 验证与发布文档

- [中文 README](../README.zh-CN.md)
- [中文发布说明](RELEASE_NOTES_1.0.0.zh-CN.md)
- [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)
- [机器可读项目状态](PROJECT_STATUS.json)
- [英文 README](../README.md)
- [Conchbase 中文快速开始](https://github.com/2648782102/conchbase/blob/main/docs/QUICK_START.zh-CN.md)

`v1.0.0` 的 Release 附带中文文档资产；仓库内的中文文档与 Release notes 保持一致。
