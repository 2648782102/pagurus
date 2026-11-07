# Pagurus

**The local control console for Conchbase agent runtimes.**

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

See [the architecture notes](docs/ARCHITECTURE.md). Chinese: [README.zh-CN.md](README.zh-CN.md).

## License

MIT. See [LICENSE](LICENSE).
