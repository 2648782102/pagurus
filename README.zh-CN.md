# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹用于配置和查看 Agents、MCP 连接、Skills 与策略。海螺负责任务执行、密钥解析和权限强制。寄居蟹是可选客户端；CLI 和其他界面也可以使用同一套 Runtime API。

当前客户端可以连接本机海螺、显示状态，在 Runtime API 版本不兼容时给出明确提示，通过已发布的 Runtime API 操作第一阶段模型任务，并编辑 Conchbase `0.5.0` 引入、`0.7.0` 继续保留的 v1/v2 版本化配置修订。用户可以选择模型、发起任务、查看流式进度、取消或重试，也可以校验/应用配置文档并回滚到已知版本。v2 文档可携带拓扑中立的组合段；海螺通过 `composition-execution` 能力声明该契约，并负责图校验与有边界的确定性执行。Conchbase `0.6.0` 声明 `tool-approval-ledger` 能力，用于运行时侧的工具请求/审批台账；`0.7.0` 还声明 `provider-tool-call-observation` 能力，用于临时的供应商工具调用规范化。寄居蟹只把这些能力名当作字符串读取，没有工具审批或观察界面，也不调用相关写入路由。配置引用只是不透明数据；可视化组合编辑、能力安装、密钥解析和模型驱动组合尚未实现。确定性的仓库护栏测试会把已接受的写入与客户端边界固定为可执行检查。

## 本地运行

要求 Node.js 24 或更高版本。

```sh
npm install
npm run dev
```

Vite 会把 `/v1` 请求代理到 `http://127.0.0.1:4318`。另行启动海螺与 Magpie，并在 Magpie 启用模型后即可运行任务。供应商密钥保存在 Magpie；寄居蟹只接收模型 id 和显示名称。

## 设计原则

- 寄居蟹提交期望配置，由海螺校验并应用。
- 安装、启用和授权是不同操作。
- 模型与工具密钥不会以明文交给界面。
- 每个任务使用固定配置版本。

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。接手开发的模型请先读 [AI 交接说明](docs/AI_HANDOFF.md)、[ADR 0004](docs/decisions/0004-versioned-configuration-client.md)、[ADR 0005](docs/decisions/0005-composition-configuration-client.md)，再读海螺仓库中的 [ADR 0017](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0017-public-tool-request-approval-ledger.md) 与 [AI 任务队列](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md)。English: [README.md](README.md).
技术栈、路线图和验证计划见 [docs/TECH_STACK.md](docs/TECH_STACK.md)、[docs/ROADMAP.md](docs/ROADMAP.md) 与 [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 面向 AI 开发

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。每次开始前先读根目录 [`AGENTS.md`](AGENTS.md)，再按其中顺序读取 [AI 交接说明](docs/AI_HANDOFF.md) 和 [开发约定](docs/AI_DEVELOPMENT.md)。

## 许可

MIT，详见 [LICENSE](LICENSE)。
