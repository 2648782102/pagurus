# 寄居蟹 · Pagurus

**海螺 Agent Runtime 的本机控制台。**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

寄居蟹用于配置和查看 Agents、MCP 连接、Skills 与策略。海螺负责任务执行、密钥解析和权限强制。寄居蟹是可选客户端；CLI 和其他界面也可以使用同一套 Runtime API。

当前骨架可以连接本机海螺健康检查接口并显示状态，配置工作流尚未实现。

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

架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。English: [README.md](README.md).
技术栈和路线图见 [docs/TECH_STACK.md](docs/TECH_STACK.md) 与 [docs/ROADMAP.md](docs/ROADMAP.md)。配套 Runtime：[Conchbase 海螺](https://github.com/2648782102/conchbase)。

## 许可

MIT，详见 [LICENSE](LICENSE)。
