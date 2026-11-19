# 寄居蟹 · Pagurus

Pagurus 是 [Conchbase 海螺](https://github.com/2648782102/conchbase) 个人 Agent
Runtime 的本机 Web 控制台。它帮助用户开始对话、查看进度、审批行动、管理
Agent 和恢复本地工作；执行、权限、密钥和持久化状态仍由 Conchbase 负责。

## 快速开始

要求 Node.js 24 或更高版本。先启动 Conchbase，再在本仓库执行：

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173/`。Vite 会把 `/v1` 代理到
`http://127.0.0.1:4318`。真实模型需要本机 provider；自动化测试使用确定性
Runtime fixture。

## 开发模型先读

- [`docs/START_HERE.md`](docs/START_HERE.md)：最短入口。
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md)：当前界面和缺口。
- [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md)：用户路径和 UI 任务。
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)：开发流程。
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：客户端边界。
- [`docs/VALIDATION_PLAN.md`](docs/VALIDATION_PLAN.md)：验证检查。

`docs/` 只保留当前产品和工程文档；实现细节以代码和测试为准，不再维护
旧流程文档。

## 开发检查

```sh
npm run check
npm test
npm run build
```

Pagurus 不读取 Conchbase 私有文件，不在浏览器保存 provider 凭证，也不实现
第二套 Runtime 状态模型。

MIT 许可，见 [`LICENSE`](LICENSE)。
