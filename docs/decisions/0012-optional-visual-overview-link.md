# Decision 0012: Optional visual overview link

Status: **accepted repository documentation boundary; no client or Runtime API contract changes**

Date: 2026-11-11 (Asia/Shanghai).

## Context

Conchbase [ADR 0027](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0027-optional-visual-overview.md) accepts one static, human-facing, non-authoritative visual overview owned by the Runtime repository. Pagurus should orient human readers without copying a second illustration that can drift from Conchbase.

## Decision

1. Pagurus does not add a local copy of the SVG or a second visual overview page.
2. `README.md` and `README.zh-CN.md` may include one optional link to the Conchbase overview page. Each link must be labeled as human-facing, optional, and not a source of truth.
3. The link is not part of `aiEntry.requiredOrder`, `PROJECT_STATUS.json`, `OBJECTIVE_MODE.zh-CN.md`, `AI_HANDOFF.md`, `AI_DEVELOPMENT.md`, or any task queue.
4. The `v1.0.0` Chinese release notes and attached Release assets remain immutable. This change is not a new release.
5. `tests/repository-guardrails.test.ts` verifies the paired disclaimer and that Pagurus does not add a local visual copy.

## Executable boundary

- Run `npm run check`, `npm test`, and `npm run build`.
- Add no dependency, private-runtime import, browser storage, new write route, generic secret resolver, credential, user data, or machine-specific path.
- Keep all existing capability gates, one-shot SecretHandle clearing, no-plaintext UI rules, and loopback Vite proxy unchanged.

> Documentation boundary only: this ADR accepts a paired link, not a UI feature, public contract, or release.
