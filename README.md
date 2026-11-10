# Pagurus

**The local control console for Conchbase agent runtimes.**

[![CI](https://img.shields.io/github/actions/workflow/status/2648782102/pagurus/ci.yml?branch=main&label=CI)](https://github.com/2648782102/pagurus/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/github/license/2648782102/pagurus)](LICENSE) [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-43853d)](https://nodejs.org/)

Pagurus is the optional control panel where users will manage and customize their own Agents. Conchbase remains responsible for Agent identity and revisions, task execution, secrets, and permission enforcement; CLI and other interfaces can use the same Runtime API.

The current client connects to Conchbase, reports Runtime API state, manages Agent profiles and immutable revisions, and edits the separate v1/v2 runtime configuration. Users can create/edit/duplicate Agents, select a default, archive profiles, choose any model exposed by the provider-neutral catalog, roll back by appending a historical revision, and compare two revisions in a read-only view. Agent-backed tasks pin the selected Agent revision and Runtime configuration revision; task views show both revisions and the effective provider/model. The task history view reads the existing `GET /v1/tasks` route, supports state and Agent filters, and keeps legacy task records visible. Streaming progress, cancel, and retry remain available. Runtimes without Agent capabilities keep the legacy Magpie compatibility task flow. Conchbase advertises tool ledger and provider observation capabilities, but Pagurus has no corresponding UI or write routes. Configuration references remain data; visual composition editing, capability installation, secret resolution, server-side task pagination/filtering, live task history, and model-driven composition remain planned.

The configuration panel remains a generic editor for one runtime-wide policy/capability revision, separate from individual Agent profiles. The v2 composition executor is deterministic and does not call a model; it is not model-driven multi-Agent execution.

Conchbase ADR 0021 exercises these published clients against the real Runtime and two independent Agents over deterministic live loopback HTTP. ADR 0007 adds only client-side read-only history and comparison on the existing contract. Its local Runtime screen has been validated manually and visually with mixed Agent/legacy tasks, provider success/error records, filters, refresh/recovery, revision comparison, and a 320px viewport. This closes local API acceptance and ADR 0007's screen walkthrough; automated real-provider conformance, accessibility, pagination/live-history, and remote-runtime validation remain separate layers.

Agent profile and Agent task model selection use Conchbase's provider-neutral contract. The Magpie-backed catalog remains available for compatibility with older runtimes and legacy clients.

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
- Each task runs against a fixed runtime configuration revision. Agent-backed tasks also pin their immutable Agent revision and effective provider/model.

See [the architecture notes](docs/ARCHITECTURE.md). New coding models should start with the [AI handoff](docs/AI_HANDOFF.md), [ADR 0006](docs/decisions/0006-agent-management-client.md), [ADR 0007](docs/decisions/0007-task-history-and-revision-comparison-client.md), Conchbase's [ADR 0020](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0020-multi-agent-and-provider-neutral-model-contract.md), [ADR 0021](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0021-cross-repository-paired-runtime-acceptance.md), and its [AI task queue](https://github.com/2648782102/conchbase/blob/main/docs/AI_TASK_QUEUE.md). Chinese: [README.zh-CN.md](README.zh-CN.md).
See also [the technology baseline](docs/TECH_STACK.md), [roadmap](docs/ROADMAP.md), and [validation plan](docs/VALIDATION_PLAN.md). The runtime is [Conchbase](https://github.com/2648782102/conchbase).

## AI-first development

This project is developed primarily by AI coding agents. Architecture, documentation, and validation are optimized for fast context loading, bounded changes, and deterministic verification; future human handoff is not a product requirement. Start with [`AGENTS.md`](AGENTS.md), then read the [AI handoff](docs/AI_HANDOFF.md) and [development guide](docs/AI_DEVELOPMENT.md).

## License

MIT. See [LICENSE](LICENSE).
