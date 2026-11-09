# Pagurus

**The local control console for Conchbase agent runtimes.**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

Pagurus is the optional control panel where users will manage and customize their own Agents. Conchbase remains responsible for Agent identity and revisions, task execution, secrets, and permission enforcement; CLI and other interfaces can use the same Runtime API.

The current client connects to a local Conchbase runtime, shows connection state, reports incompatible Runtime API versions, operates phase-1 model tasks, and edits the v1/v2 versioned configuration revisions introduced in Conchbase `0.5.0` and kept by `0.7.0`. Users can select a model, run a task with streaming progress, cancel/retry it, validate/apply a configuration document, and roll back to a known revision. A v2 document can carry a topology-neutral composition section; the runtime advertises `composition-execution` and owns graph validation and bounded deterministic execution. Conchbase `0.6.0` advertises a `tool-approval-ledger` capability for runtime-owned tool request/approval records, and `0.7.0` also advertises `provider-tool-call-observation` for transient normalization; Pagurus reads capabilities as strings but has no tool approval or observation UI or write route yet. Configuration references are opaque data; visual composition editing, capability installation, secret resolution, and model-driven composition are planned work. Deterministic repository guardrail tests keep the accepted write and client boundaries explicit.

The current configuration panel is a generic editor for one runtime-wide configuration revision, not an Agent collection. Conchbase does not yet expose first-class Agent instructions, default models, or per-Agent revisions. The roadmap prioritizes a collection of independently configurable Agents and a task flow that pins and displays the selected Agent revision alongside runtime-wide configuration. The v2 composition executor is deterministic and does not call a model; it is not model-driven multi-Agent execution.

The current task model picker uses Conchbase's Magpie-backed compatibility catalog. Planned Agent model references and selection must follow Conchbase's provider-neutral contract so Magpie remains supported without becoming the only provider or defining the Agent schema.

## Run locally

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

The Vite development server proxies `/v1` requests to `http://127.0.0.1:4318`. The current Conchbase compatibility adapter uses Magpie, so start both services and enable a model there to run a task. This describes current adapter support; it is not a restriction on future Agent provider choices. Provider credentials stay behind the runtime adapter boundary; Pagurus receives no secrets.

## Principles

- Pagurus submits desired configuration; Conchbase validates and applies it.
- Installing, enabling, and granting access are separate actions.
- The console never receives model or tool secrets in clear text.
- Each existing task runs against a fixed runtime configuration revision. The planned Agent workflow will pin the Agent revision separately as well.

See [the architecture notes](docs/ARCHITECTURE.md). New coding models should start with the [AI handoff](docs/AI_HANDOFF.md), [ADR 0004](docs/decisions/0004-versioned-configuration-client.md), [ADR 0005](docs/decisions/0005-composition-configuration-client.md), Conchbase's [ADR 0017](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0017-public-tool-request-approval-ledger.md), and its [AI task queue](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md). Chinese: [README.zh-CN.md](README.zh-CN.md).
See also [the technology baseline](docs/TECH_STACK.md), [roadmap](docs/ROADMAP.md), and [validation plan](docs/VALIDATION_PLAN.md). The runtime is [Conchbase](https://github.com/2648782102/conchbase).

## AI-first development

This project is developed primarily by AI coding agents. Architecture, documentation, and validation are optimized for fast context loading, bounded changes, and deterministic verification; future human handoff is not a product requirement. Start with [`AGENTS.md`](AGENTS.md), then read the [AI handoff](docs/AI_HANDOFF.md) and [development guide](docs/AI_DEVELOPMENT.md).

## License

MIT. See [LICENSE](LICENSE).
