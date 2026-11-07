# Pagurus

**The local control console for Conchbase agent runtimes.**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

Pagurus lets users configure and inspect agents, MCP connections, Skills, and policies. Conchbase remains responsible for task execution, secrets resolution, and permission enforcement. The console is an optional client; CLI and other interfaces can use the same runtime API.

The current scaffold connects to a local Conchbase health endpoint and shows connection state. Configuration workflows are planned work.

## Run locally

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

The Vite development server proxies `/v1` requests to `http://127.0.0.1:4318`. Start Conchbase separately to see the connected state. The initial screen makes read-only health requests.

## Principles

- Pagurus submits desired configuration; Conchbase validates and applies it.
- Installing, enabling, and granting access are separate actions.
- The console never receives model or tool secrets in clear text.
- Each task runs against a fixed configuration revision.

See [the architecture notes](docs/ARCHITECTURE.md). New coding models should start with the [AI handoff](docs/AI_HANDOFF.md). Chinese: [README.zh-CN.md](README.zh-CN.md).
See also [the technology baseline](docs/TECH_STACK.md), [roadmap](docs/ROADMAP.md), and [validation plan](docs/VALIDATION_PLAN.md). The runtime is [Conchbase](https://github.com/2648782102/conchbase).

## License

MIT. See [LICENSE](LICENSE).
