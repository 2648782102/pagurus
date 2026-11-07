# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹用于配置和查看 Agents、MCP 连接、Skills 与策略。海螺负责任务执行、密钥解析和权限强制。寄居蟹是可选客户端；CLI 和其他界面也可以使用同一套 Runtime API。

当前骨架可以连接本机海螺健康检查接口、显示状态，并在 Runtime API 版本不兼容时给出明确提示；配置工作流尚未实现。

## 本地运行

要求 Node.js 24 或更高版本。

```sh
npm install
npm run dev
```

Vite 会把 `/v1` 请求代理到 `http://127.0.0.1:4318`。另行启动海螺后即可看到连接状态。

## 设计原则

- 寄居蟹提交期望配置，由海螺校验并应用。
- 安装、启用和授权是不同操作。
- 模型与工具密钥不会以明文交给界面。
- 每个任务使用固定配置版本。

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。接手开发的模型请先读 [AI 交接说明](docs/AI_HANDOFF.md)，再读海螺仓库中的 [AI 任务队列](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md)。English: [README.md](README.md).
技术栈、路线图和验证计划见 [docs/TECH_STACK.md](docs/TECH_STACK.md)、[docs/ROADMAP.md](docs/ROADMAP.md) 与 [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 面向 AI 开发

本项目主要由 AI 编码 Agent 开发，代码结构、说明和验证流程优先服务于 AI 快速理解、完成边界清楚的改动并确定性验证；不把后续由人类接手作为产品要求。每次开始前先读根目录 [`AGENTS.md`](AGENTS.md)，再按其中顺序读取 [AI 交接说明](docs/AI_HANDOFF.md) 和 [开发约定](docs/AI_DEVELOPMENT.md)。

## 许可

MIT，详见 [LICENSE](LICENSE)。
