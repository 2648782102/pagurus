# Decision 0001: Executable client development guardrails

Status: accepted for repository development guardrails, not a public API contract.

## Context

Pagurus is developed primarily by AI coding agents, and the repository does not optimize for human handoff. Conchbase's `docs/AI_TASK_QUEUE.md` blocks the next implementation slice until product direction is given on the open ADRs. A weaker model working in Pagurus could otherwise invent a second API schema, add configuration write routes, use browser storage for secrets, connect to a non-loopback runtime, or present planned configuration workflows as implemented.

Conchbase [ADR 0009](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0009-ai-development-guardrails.md) records the value of deterministic, dependency-free repository canaries for AI-first development. Pagurus needs the client-side equivalent: a small test suite that fails when the current read-only client boundary is crossed.

## Options

### A. Narrow repository guardrail tests in Vitest (recommended)

- Add `tests/repository-guardrails.test.ts` to the existing test and CI path, using Node built-ins and Vitest.
- Check AI-first entry documents, the accepted development decision, the two read-only `/v1` calls, loopback development proxy, absence of private-file/runtime/provider imports, absence of browser storage, absence of write-fetch calls, and absence of premature dependencies in `package.json` and `package-lock.json`.
- Include synthetic violations that prove the helper checks fail rather than silently becoming tautologies.

Consequences: a weaker model gets immediate, deterministic feedback before creating a competing contract. The checks are intentionally brittle about current facts and must evolve with accepted Conchbase ADRs and Pagurus decisions. They do not validate configuration features that do not exist.

### B. Prose-only instructions

Keep all boundaries in `AGENTS.md`, `docs/AI_HANDOFF.md`, and the development guide.

Consequences: no new test code, but a model can still add a write call or a second schema and receive a green CI run. Rejected because AI-first development needs machine feedback.

### C. Generated client or policy framework

Build a generated API client or general repository-policy engine before the public contract is accepted.

Consequences: adds a second source of truth, dependencies, and complexity while Conchbase's API remains intentionally read-only and product-direction blocked. Rejected.

## Recommendation

Accept option A as a **development boundary only**. This record does not authorize configuration write routes, generated client types, a provider SDK, an MCP SDK, a storage driver, browser persistence, remote pairing, or task/approval UI. It does not implement an agent loop or change Conchbase's public contract. Product direction on Conchbase ADRs `0002`–`0008` remains required before dependent client work can begin.

The guardrails must stay small, deterministic, and dependency-free beyond the existing Vitest baseline. Update them only alongside an accepted ADR or a documented development-boundary change, never merely to make an unrelated change pass.

## Validation

`tests/repository-guardrails.test.ts` is included by `vitest run` and therefore by `npm test` and CI. It uses local repository files and synthetic strings; it performs no network calls and contains no credentials or personal data. It checks:

- required AI-first and client-invariant phrases in `AGENTS.md`;
- implemented-versus-planned wording in `docs/AI_HANDOFF.md`, `README.md`, and `README.zh-CN.md`;
- the accepted status and explicit non-authorization wording in this decision record;
- exactly the current `GET /v1/health` and `GET /v1/runtime` read-only fetch boundary;
- the loopback-only Vite development proxy;
- no private-file, provider, storage, or premature state-framework imports across `src/` and `tests/`;
- no browser storage or undocumented write-fetch calls across `src/` and `tests/`;
- no premature client/runtime dependency in `package.json` or `package-lock.json`;
- representative synthetic violations fail the guardrail helpers.

See `docs/VALIDATION_PLAN.md` for current automated coverage and future validation layers.
