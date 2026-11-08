# Pagurus

**The local control console for Conchbase agent runtimes.**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

Pagurus lets users configure and inspect agents, MCP connections, Skills, and policies. Conchbase remains responsible for task execution, secrets resolution, and permission enforcement. The console is an optional client; CLI and other interfaces can use the same runtime API.

The current client connects to a local Conchbase runtime, shows connection state, reports incompatible Runtime API versions, operates phase-1 model tasks, and edits Conchbase `0.4.0` versioned configuration revisions. Users can select a model, run a task with streaming progress, cancel/retry it, validate/apply a configuration document, and roll back to a known revision. Configuration references are opaque data; capability installation, secret resolution, and composition workflows are planned work. Deterministic repository guardrail tests keep the accepted write and client boundaries explicit.

## Run locally

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

The Vite development server proxies `/v1` requests to `http://127.0.0.1:4318`. Start Conchbase and Magpie separately, then enable a model in Magpie to run a task. Provider credentials stay in Magpie; Pagurus receives model ids and display names only.

## Principles

- Pagurus submits desired configuration; Conchbase validates and applies it.
- Installing, enabling, and granting access are separate actions.
- The console never receives model or tool secrets in clear text.
- Each task runs against a fixed configuration revision.

See [the architecture notes](docs/ARCHITECTURE.md). New coding models should start with the [AI handoff](docs/AI_HANDOFF.md), [ADR 0004](docs/decisions/0004-versioned-configuration-client.md), and Conchbase's [AI task queue](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md). Chinese: [README.zh-CN.md](README.zh-CN.md).
See also [the technology baseline](docs/TECH_STACK.md), [roadmap](docs/ROADMAP.md), and [validation plan](docs/VALIDATION_PLAN.md). The runtime is [Conchbase](https://github.com/2648782102/conchbase).

## AI-first development

This project is developed primarily by AI coding agents. Architecture, documentation, and validation are optimized for fast context loading, bounded changes, and deterministic verification; future human handoff is not a product requirement. Start with [`AGENTS.md`](AGENTS.md), then read the [AI handoff](docs/AI_HANDOFF.md) and [development guide](docs/AI_DEVELOPMENT.md).

## License

MIT. See [LICENSE](LICENSE).
