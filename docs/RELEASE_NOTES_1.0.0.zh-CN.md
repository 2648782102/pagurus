# 寄居蟹 Pagurus 1.0.0 中文发布说明

> 本文件是 `v1.0.0` 的中文发布说明。英文仓库文档、Conchbase `docs/openapi.yaml` 和已接受的 ADR 仍是契约事实源；本文件不新增 API、架构决策或产品边界。

## 发布范围

- 项目：寄居蟹 Pagurus，海螺 Conchbase 的可选本机控制客户端。
- 版本：`v1.0.0`，与 [Conchbase v1.0.0](https://github.com/2648782102/conchbase/blob/main/docs/RELEASE_NOTES_1.0.0.zh-CN.md) 配对。
- 定位：用户通过 Pagurus 管理和定制自己的 Agent、全局配置、持久工作、能力元数据与 SecretHandle。Conchbase 始终拥有 Agent 身份、任务状态、持久工作、密钥、权限和私有文件；Pagurus 不读取私有数据库，也不建立第二套状态 schema。
- 最终本地优先目标：Pagurus [ADR 0010](decisions/0010-final-local-first-client.md) 与 Conchbase [ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md) 已闭合。

## 本次发布内容

- Agent profile 与不可变版本管理：创建、编辑、复制、归档、默认选择、版本回滚历史和只读比较。
- 供应商中立的模型选择；Magpie 兼容目录只服务旧 Runtime 与旧任务路径，不成为 Agent schema。
- 独立的 v1/v2 运行时全局配置编辑，且保留与 Agent profile 的边界。
- 最终本地优先控制工作台：work start/stop/complete、重启恢复对账、交付决策、有界工作事件证据。
- 本地 Source 策略、能力目录记录和只写 SecretHandle 编辑器；每个界面按 Runtime 已发布 capability 门禁。
- 一次性敏感值提交后立即清除；客户端不回读、不展示、不存储、不解析明文，只展示 handle 元数据与摘要收据。
- 仅使用 Conchbase 已发布的 `1.0.0` 路径，通过同源 `/v1` 开发代理接入 Runtime。

## 验证结果

- `npm run check && npm test && npm run build` 全部通过：Pagurus 79 个测试；配对的 Conchbase 112 个测试也通过。
- 完成最终本地优先真实端到端走查：真实 Conchbase 开发服务、真实 Pagurus Vite `/v1` 代理、临时 SQLite 数据库，共 54 个确定性 HTTP 请求。
- 走查覆盖已发布 Runtime capability、work 控制与重启恢复、本地 Source 策略、能力目录、配对元数据、SecretHandle 创建/轮换/状态/固定适配器使用，以及摘要收据。
- sentinel 值未出现在代理响应、持久事件、日志或数据库字节中。
- 这不是渲染 UI 的自动化视觉验收、自动化无障碍、真实供应商一致性、生产远程 UX 或生产存储恢复验证。

## 明确不包含

- 真实外部 Source、真实 Outbox 外部写入、可执行工具、MCP/Skill/plugin 安装与生命周期、宿主执行隔离。
- 通用密钥解析器、OS keychain、稳定跨进程密钥、可重放的静态加密值、任意外部固定适配器。
- SSE、事件保留策略、服务端任务分页/筛选、实时历史、生产远程配对 UX、桌面打包与云部署。
- 可视化组合编辑器、模型驱动多 Agent 执行、工具审批 UI、生产审批工作流。

这些能力必须先写新的已接受 ADR，再改变公开契约。

## 中文文档

- [中文 README](../README.zh-CN.md)
- [中文快速开始](QUICK_START.zh-CN.md)
- [中文发布说明](RELEASE_NOTES_1.0.0.zh-CN.md)
- [英文 README](../README.md)
- [AI 交接说明](AI_HANDOFF.md)、[开发约定](AI_DEVELOPMENT.md)、[架构](ARCHITECTURE.md)、[技术栈](TECH_STACK.md)、[验证计划](VALIDATION_PLAN.md)
- [目标模式接手说明](OBJECTIVE_MODE.zh-CN.md)、[机器可读项目状态](PROJECT_STATUS.json)、[ADR 0011](decisions/0011-ai-handoff-readiness-development-boundary.md)

本 Release 同时附带上述中文文档资产，便于离线阅读和交付给其他开发模型。

## AI 开发入口

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。接手模型应先读 [`AGENTS.md`](../AGENTS.md)，再按 `docs/AI_HANDOFF.md` 的顺序读取英文契约文档。中文文档是阅读入口，不替代英文事实源。

代码改动后运行：

```sh
npm run check
npm test
npm run build
```

## 许可

MIT，详见 [LICENSE](../LICENSE)。配套 Runtime：[Conchbase v1.0.0 中文发布说明](https://github.com/2648782102/conchbase/blob/main/docs/RELEASE_NOTES_1.0.0.zh-CN.md)。
