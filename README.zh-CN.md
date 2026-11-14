# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹 `1.0.0` 是用户管理和定制自己 Agents 与本地优先 Runtime 的可选控制面板。海螺负责 Agent 身份与版本、任务执行、持久工作状态、密钥和权限；CLI 与其他界面也可以使用同一套 Runtime API。

[ADR 0010](docs/decisions/0010-final-local-first-client.md) 已实现最终本地优先 `1.0.0` 的配套客户端：持久工作 start/stop/complete、重启恢复对账、交付决策、本地 Source 策略与有界事件证据的控制工作台；能力元数据目录；以及支持只写提交、轮换、状态变更、固定适配器使用和摘要收据的 SecretHandle 编辑器。每个界面都由已发布的 Runtime capability 门禁。[ADR 0008](docs/decisions/0008-human-attention-workbench-proposal.md) 与 [ADR 0009](docs/decisions/0009-read-only-attention-workbench-client.md) 是历史记录。一次性 value 提交后，界面不回读、不展示、不保留明文。

当前客户端可以连接海螺、显示 Runtime 状态、管理 Agent profile 与不可变版本、编辑独立的 v1/v2 全局运行时配置、控制持久工作、记录有界能力元数据，并一次性提交 SecretHandle value。用户可以创建/编辑/复制 Agent、设置默认项、归档、选择供应商中立目录中的模型、通过追加历史版本内容来回滚，并在只读视图中比较两个版本。Agent 任务固定所选 Agent 版本和运行时配置版本；任务页展示两个版本以及实际 provider/model。任务历史使用已有的 `GET /v1/tasks`，支持按状态和 Agent 筛选，并保留旧 Runtime 任务。流式进度、取消和重试继续可用。不具备 Agent 能力的旧 Runtime 会继续走 Magpie 兼容任务流程。海螺声明工具台账和供应商工具观察能力，但寄居蟹尚无对应界面或写入路由。配置引用仍只是数据；可视化组合编辑、可执行能力安装、通用密钥解析、服务端任务分页/筛选、任务实时历史、模型驱动组合、远程配对 UX 与稳定跨进程密钥托管仍在最终本地优先目标之外。

配置面板仍是编辑全局策略/能力配置版本的通用 JSON 编辑器，与各 Agent profile 分开管理。v2 组合执行器只做确定性执行、不调用模型，不代表模型驱动的多 Agent 执行。

控制台壳层把这些已实现界面组织为七个带文字标签的 hash 工作区，并保留常驻连接状态与当前导航高亮。[ADR 0013](docs/decisions/0013-console-workspace-navigation.md) 记录了这个只改变表现层的边界；它不改变 Runtime API、capability 门禁或版本化契约。

海螺 ADR 0021 已让这些已发布的客户端与真实 Runtime、两个独立 Agent 在确定性的本机 loopback HTTP 上完成闭环验收。ADR 0007 只在已有契约上增加客户端只读历史和版本比较，并已针对真实本地 Runtime 完成手工/视觉走查：混合 Agent/旧任务、成功与供应商错误记录、筛选、刷新恢复、只读版本比较和 320px 窄屏均可见。这标志着本地 API 验收和 ADR 0007 页面走查完成；自动化真实供应商一致性、无障碍、分页/实时历史和远程 Runtime 验证仍是独立层次。

Agent profile 和 Agent 任务使用海螺的供应商中立模型契约。Magpie 兼容模型目录仍供旧 Runtime 与旧客户端使用。

## 本地运行

要求 Node.js 24 或更高版本。

```sh
npm install
npm run dev
```

Vite 会把 `/v1` 请求代理到 `http://127.0.0.1:4318`。当前海螺兼容适配器使用 Magpie，因此要启动两个服务并在 Magpie 启用模型才能运行任务。这描述的是当前适配器支持，不限制未来 Agent 的供应商选择。凭证由运行时适配器边界管理，寄居蟹不会接收密钥。

## 设计原则

- 寄居蟹提交期望配置，由海螺校验并应用。
- 安装、启用和授权是不同操作。
- 模型与工具密钥不会以明文交给界面。
- 每个任务都固定运行时配置版本；Agent 任务还会固定不可变的 Agent 版本和生效的 provider/model。

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。接手开发的模型请先读 [AI 交接说明](docs/AI_HANDOFF.md)、[机器可读项目状态](docs/PROJECT_STATUS.json)、[目标模式接手说明](docs/OBJECTIVE_MODE.zh-CN.md)、[ADR 0010](docs/decisions/0010-final-local-first-client.md)、[ADR 0011](docs/decisions/0011-ai-handoff-readiness-development-boundary.md)、[ADR 0014](docs/decisions/0014-interface-validation-boundary.md)、远期 [ADR 0015](docs/decisions/0015-organization-console-direction.md) 与 [ADR 0016](docs/decisions/0016-organization-console-delivery-boundary.md)，再读海螺[组织运行时目标](https://github.com/2648782102/conchbase/blob/main/docs/ORGANIZATION_RUNTIME_TARGET.zh-CN.md)、[ADR 0025](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0025-local-first-v1-platform.md)、[ADR 0030–0034](https://github.com/2648782102/conchbase/tree/main/docs/decisions) 与 [AI 任务队列](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md)。中文文档：[快速开始](docs/QUICK_START.zh-CN.md)、[v1.0.0 发布说明](docs/RELEASE_NOTES_1.0.0.zh-CN.md)。另有可选的[双仓视觉概览](https://github.com/2648782102/conchbase/blob/main/docs/VISUAL_OVERVIEW.zh-CN.md)，仅供人类快速理解，不是事实源。English: [README.md](README.md).

Boss Mode `1.1.0` 的已连接组织控制台见 [ADR 0018](docs/decisions/0018-boss-mode-console-product-loop.md) 与 [v1.1.0 中文发布说明](docs/RELEASE_NOTES_1.1.0.zh-CN.md)。受控执行 v1 已按 [ADR 0020](docs/decisions/0020-controlled-execution-console-v1.md) 与 [v1.2.0 中文发布说明](docs/RELEASE_NOTES_1.2.0.zh-CN.md) 接入确定性 fake executor；隔离执行 v2 已按 [ADR 0021](docs/decisions/0021-isolated-execution-console-v2.md) 与 [v1.3.0 中文发布说明](docs/RELEASE_NOTES_1.3.0.zh-CN.md) 接入 Runtime 拥有的隔离子进程；主会话对话投影已按 [ADR 0022](docs/decisions/0022-primary-conversation-console.md) 与 [v1.4.0 中文发布说明](docs/RELEASE_NOTES_1.4.0.zh-CN.md) 接入 Runtime 发布的编排事实对话栏；独立 Agent 对话已按 [ADR 0023](docs/decisions/0023-agent-chat-console.md) 与 [v1.5.0 中文发布说明](docs/RELEASE_NOTES_1.5.0.zh-CN.md) 接入；[ADR 0024](docs/decisions/0024-boss-agent-chat-console.md) 把 Runtime 拥有的「老板 Agent」设为 Agent 对话首选入口；[ADR 0025](docs/decisions/0025-codex-style-agent-chat-flow.md) 将 Agent 对话重做为先配置、后连续聊天的 Codex 式流程；[ADR 0026](docs/decisions/0026-agent-chat-conversation-states-console.md) 补全思考、流式回复、组织编排、等待确认、失败、不可用和取消状态。能力记录仍不代表授权，真实 MCP/Skill/plugin/宿主工具执行仍未实现。
技术栈、路线图和验证计划见 [docs/TECH_STACK.md](docs/TECH_STACK.md)、[docs/ROADMAP.md](docs/ROADMAP.md) 与 [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 面向 AI 开发

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。每次开始前先读根目录 [`AGENTS.md`](AGENTS.md)，并以 [`docs/PROJECT_STATUS.json`](docs/PROJECT_STATUS.json) 的 `aiEntry.requiredOrder` 为阅读顺序：[AI 交接说明](docs/AI_HANDOFF.md)、[机器可读项目状态](docs/PROJECT_STATUS.json)、[目标模式接手说明](docs/OBJECTIVE_MODE.zh-CN.md) 和 [开发约定](docs/AI_DEVELOPMENT.md)。

实现下一产品切片前请读已接受的 [ADR 0010](docs/decisions/0010-final-local-first-client.md)、[ADR 0014](docs/decisions/0014-interface-validation-boundary.md)、[ADR 0018](docs/decisions/0018-boss-mode-console-product-loop.md)、[ADR 0019](docs/decisions/0019-controlled-execution-console-direction.md)、[ADR 0020](docs/decisions/0020-controlled-execution-console-v1.md)、[ADR 0021](docs/decisions/0021-isolated-execution-console-v2.md)、[ADR 0022](docs/decisions/0022-primary-conversation-console.md)、历史 [ADR 0008](docs/decisions/0008-human-attention-workbench-proposal.md) / [ADR 0009](docs/decisions/0009-read-only-attention-workbench-client.md)，以及海螺 [ADR 0041](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0041-boss-mode-product-loop.md) / [ADR 0042](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0042-controlled-execution-direction.md) / [ADR 0043](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0043-controlled-execution-v1.md) / [ADR 0044](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0044-isolated-local-execution-v2.md) / [ADR 0045](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0045-primary-conversation-projection.md)、additive `1.1.0` 组织契约、additive `1.2.0` 受控执行契约、additive `1.3.0` execution run 契约与 additive `1.4.0` 主会话对话契约。ADR 0014 已闭合可执行无障碍与已发布契约夹具；ADR 0018 已连接老板模式控制台；ADR 0021 已连接确定性隔离执行 v2；ADR 0022 已连接 Runtime 发布的主会话对话栏。状态 JSON 中没有 `ready` 有界任务。新增真实 MCP/Skill/plugin 生命周期、宿主工具执行、持久化消息撰写、外部适配器、稳定跨进程密钥或远程配对 UX 之前，两个仓库都必须先接受新的实现契约。

> 最终本地优先目标：寄居蟹 `1.0.0` 与 ADR 0010 已闭合配套控制客户端。敏感值只通过已发布只写路由一次性提交并立即清除，客户端绝不回读、显示、存储或解析明文。海螺持有进程内 AES-256-GCM 封存值、固定适配器注入、摘要收据和重启失效边界；OS keychain、任意适配器、真实工具、外部 Source 与云部署都需要新的 ADR。

## 许可

MIT，详见 [LICENSE](LICENSE)。
