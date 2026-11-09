# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹是用户管理和定制自己 Agents 的可选控制面板。海螺负责 Agent 身份与版本、任务执行、密钥和权限；CLI 与其他界面也可以使用同一套 Runtime API。

当前客户端可以连接本机海螺、显示状态，在 Runtime API 版本不兼容时给出明确提示，通过已发布的 Runtime API 操作第一阶段模型任务，并编辑 Conchbase `0.5.0` 引入、`0.7.0` 继续保留的 v1/v2 版本化配置修订。用户可以选择模型、发起任务、查看流式进度、取消或重试，也可以校验/应用配置文档并回滚到已知版本。v2 文档可携带拓扑中立的组合段；海螺通过 `composition-execution` 能力声明该契约，并负责图校验与有边界的确定性执行。Conchbase `0.6.0` 声明 `tool-approval-ledger` 能力，用于运行时侧的工具请求/审批台账；`0.7.0` 还声明 `provider-tool-call-observation` 能力，用于临时的供应商工具调用规范化。寄居蟹只把这些能力名当作字符串读取，没有工具审批或观察界面，也不调用相关写入路由。配置引用只是不透明数据；可视化组合编辑、能力安装、密钥解析和模型驱动组合尚未实现。确定性的仓库护栏测试会把已接受的写入与客户端边界固定为可执行检查。

当前配置面板只是编辑一个全局运行时配置版本的通用 JSON 编辑器，还不是 Agent 集合。海螺目前没有一等的 Agent 指令、默认模型或独立 Agent 版本。路线图优先建设可分别定制多个 Agent 的能力，并让每个任务固定且展示所选 Agent 版本及运行时全局配置版本。v2 组合执行器只做确定性执行、不调用模型，不代表模型驱动的多 Agent 执行。

当前任务模型选择器使用海螺经 Magpie 兼容适配器提供的模型目录。这是现有实现事实，不是产品限制；未来 Agent 的模型引用与选择必须遵循海螺的供应商中立契约，让 Magpie 保持兼容，同时支持其他适配器，且不把 Magpie 目录结构写入 Agent 配置。

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
- 现有任务使用固定的运行时配置版本；计划中的 Agent 工作流还会单独固定 Agent 版本。

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。接手开发的模型请先读 [AI 交接说明](docs/AI_HANDOFF.md)、[ADR 0004](docs/decisions/0004-versioned-configuration-client.md)、[ADR 0005](docs/decisions/0005-composition-configuration-client.md)，再读海螺仓库中的 [ADR 0017](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0017-public-tool-request-approval-ledger.md) 与 [AI 任务队列](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md)。English: [README.md](README.md).
技术栈、路线图和验证计划见 [docs/TECH_STACK.md](docs/TECH_STACK.md)、[docs/ROADMAP.md](docs/ROADMAP.md) 与 [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 面向 AI 开发

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。每次开始前先读根目录 [`AGENTS.md`](AGENTS.md)，再按其中顺序读取 [AI 交接说明](docs/AI_HANDOFF.md) 和 [开发约定](docs/AI_DEVELOPMENT.md)。

## 许可

MIT，详见 [LICENSE](LICENSE)。
