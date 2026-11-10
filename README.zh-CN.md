# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹是用户管理和定制自己 Agents 的可选控制面板。海螺负责 Agent 身份与版本、任务执行、密钥和权限；CLI 与其他界面也可以使用同一套 Runtime API。

当前客户端可以连接海螺、显示 Runtime 状态、管理 Agent profile 与不可变版本，并编辑独立的 v1/v2 全局运行时配置。用户可以创建/编辑/复制 Agent、设置默认项、归档、选择供应商中立目录中的模型、通过追加历史版本内容来回滚，并在只读视图中比较两个版本。Agent 任务固定所选 Agent 版本和运行时配置版本；任务页展示两个版本以及实际 provider/model。任务历史使用已有的 `GET /v1/tasks`，支持按状态和 Agent 筛选，并保留旧 Runtime 任务。流式进度、取消和重试继续可用。不具备 Agent 能力的旧 Runtime 会继续走 Magpie 兼容任务流程。海螺声明工具台账和供应商工具观察能力，但寄居蟹尚无对应界面或写入路由。配置引用仍只是数据；可视化组合编辑、能力安装、密钥解析、服务端任务分页/筛选、任务实时历史和模型驱动组合仍未实现。

配置面板仍是编辑全局策略/能力配置版本的通用 JSON 编辑器，与各 Agent profile 分开管理。v2 组合执行器只做确定性执行、不调用模型，不代表模型驱动的多 Agent 执行。

海螺 ADR 0021 已让这些已发布的客户端与真实 Runtime、两个独立 Agent 在确定性的本机 loopback HTTP 上完成闭环验收。ADR 0007 只在已有契约上增加客户端只读历史和版本比较。这标志着本地 API 验收完成；真实供应商、可视化/手工 UI、无障碍、分页/实时历史和远程 Runtime 验证仍是独立层次。

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

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。接手开发的模型请先读 [AI 交接说明](docs/AI_HANDOFF.md)、[ADR 0006](docs/decisions/0006-agent-management-client.md)，再读海螺仓库中的 [ADR 0020](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0020-multi-agent-and-provider-neutral-model-contract.md)、[ADR 0021](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0021-cross-repository-paired-runtime-acceptance.md) 与 [AI 任务队列](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md)。English: [README.md](README.md).
技术栈、路线图和验证计划见 [docs/TECH_STACK.md](docs/TECH_STACK.md)、[docs/ROADMAP.md](docs/ROADMAP.md) 与 [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 面向 AI 开发

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。每次开始前先读根目录 [`AGENTS.md`](AGENTS.md)，再按其中顺序读取 [AI 交接说明](docs/AI_HANDOFF.md) 和 [开发约定](docs/AI_DEVELOPMENT.md)。

## 许可

MIT，详见 [LICENSE](LICENSE)。
