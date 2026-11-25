# Boss Agent 1080p Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Boss Agent surface into a modern 1080p three-region workspace with a live work rail, center conversation, and responsive context overlay, using modern Web features and motion-bound state.

**Architecture:** Keep the Runtime authoritative and Pagurus read-only. Split the current top `BossWorkPanel` into a desktop left work rail that consumes existing organization facts and Boss transcript notices; keep all decisions in the center thread; turn the context panel into an overlay between 900–1279px and a real third column at 1280px+. Add CSS-only motion tokens and guardrails so state remains accessible without animation.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Vitest 5, existing CSS token and motion library, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-boss-agent-1080p-layout-design.md`

## Global Constraints

- Use Node.js 24 or newer.
- No new runtime dependencies; approved client dependencies are React, React DOM, and Lucide only.
- Browser code must not import Node APIs, write secrets to browser storage, or read private Runtime state.
- Do not add a second chat entry or parse Boss prose for organization facts.
- Light and dark themes must share the information architecture.
- Motion must be CSS-only, named in `motion-tokens.css`, paired with text/icon state, and removed under reduced motion.
- Use modern semantic HTML and modern CSS; no inline event handlers, presentational HTML attributes, legacy hacks, or obsolete vendor-prefixed properties in touched files.

## Review Focus

- Narrow in-app viewport: at 843px the compact work strip must leave the transcript usable — Task 3 component tests and visual QA.
- State source confusion: worker/report animation must follow organization facts, not the Boss reply stream — Task 1 projection test.
- Reduced motion: all state must remain readable when looping cues are removed — Task 4 guardrail test.
- Missing organization data: unsupported Runtime or failed reads must not blank the conversation — Task 2 tests.
- Themes: new surfaces must use semantic tokens so light and dark both render — Task 4 architecture tests.

---

### Task 1: Pin the work-state projection contract

**Files:**
- Modify: `src/agent/boss-work-view.ts`
- Test: `tests/boss-work-view.test.ts`

**Interfaces:**
- Consumes: `OrganizationSessionView`, `AgentChatMessage` from `src/shared/api/*`.
- Produces: `BossWorkView` with `projects`, `notices`, `attention`; worker/report state fields remain the authoritative motion source.

- [ ] **Step 1: Write the failing test**

Add tests asserting that a worker with `state: 'running'` and no report produces an active work item, a report with `state: 'failed'` produces failure state, and a runtime notice is classified as a report notice without becoming an assistant turn.

- [ ] **Step 2: Run test to verify it fails**

Run `cd pagurus && npx vitest run tests/boss-work-view.test.ts`; expect a failure for the new state fields.

- [ ] **Step 3: Implement the minimal projection change**

Extend `BossWorkWorkerView` with `activity: 'active' | 'attention' | 'done' | 'failed' | 'idle'` derived only from worker/report/attention state. Keep `buildBossWorkView(input: BossWorkViewInput): BossWorkView`.

- [ ] **Step 4: Run test to verify it passes**

Run `cd pagurus && npx vitest run tests/boss-work-view.test.ts`; expect PASS.

### Task 2: Build the desktop work rail component

**Files:**
- Modify: `src/agent/BossWorkPanel.tsx`
- Test: `tests/boss-work-panel.test.tsx`

**Interfaces:**
- Consumes: `buildBossWorkView` and `BossWorkView.activity`.
- Produces: `BossWorkPanel({ runtime, messages })` rendering `<aside class="boss-work-rail">` with an Attention section, project/worker list, and recent reports.

- [ ] **Step 1: Write the failing test**

Update `tests/boss-work-panel.test.tsx` to assert an `aside` named `正在推进`, an Attention section before projects, worker activity classes, and bounded failure detail text.

- [ ] **Step 2: Run test to verify it fails**

Run `cd pagurus && npx vitest run tests/boss-work-panel.test.tsx`; expect failure on the new semantic/ARIA assertions.

- [ ] **Step 3: Implement the work rail markup**

Replace the top-card markup with semantic `<aside>`, `<section>`, `<ol>`, `<li>`, `<details>`, and `<summary>`. Use `activity` for classes. No inline handlers or presentational attributes.

- [ ] **Step 4: Run test to verify it passes**

Run `cd pagurus && npx vitest run tests/boss-work-panel.test.tsx`; expect PASS.

### Task 3: Rebuild the App shell into responsive regions

**Files:**
- Modify: `src/agent/AgentApp.tsx`, `src/styles/agent-shell.css`, `src/styles/agent-context.css`, `src/styles/agent-responsive.css`
- Test: `tests/agent-app.test.tsx`, `tests/agent-context-panel.test.tsx`

**Interfaces:**
- Consumes: `BossWorkPanel`, `AgentContextPanel`, `AgentChatThread`, `AgentChatComposer`.
- Produces: `.agent-workspace` with left rail track, center page track, and context track that overlays at 900–1279px and participates in grid at ≥1280px.

- [ ] **Step 1: Write the failing test**

Update `tests/agent-app.test.tsx` to assert the Boss surface contains `<aside aria-label="正在推进">` and that no model control exists above the transcript. Add a context-panel test for `inert` when closed.

- [ ] **Step 2: Run test to verify it fails**

Run `cd pagurus && npx vitest run tests/agent-app.test.tsx tests/agent-context-panel.test.tsx`; expect failure on the semantic work rail assertion.

- [ ] **Step 3: Implement the grid**

Use CSS grid with named areas, logical properties, `minmax()`, `clamp()`, `dvh`, `:has()`, native nesting, `color-mix()`, and `text-wrap` where they clarify layout. Keep the center transcript widest. At 900–1279px, position the context drawer as an overlay; at ≥1280px give it a real column when open.

- [ ] **Step 4: Run test to verify it passes**

Run `cd pagurus && npx vitest run tests/agent-app.test.tsx tests/agent-context-panel.test.tsx`; expect PASS.

### Task 4: Add modern motion states and guardrails

**Files:**
- Modify: `src/styles/motion-tokens.css`, `src/styles/boss-work.css`, `tests/architecture.test.ts`
- Test: `tests/architecture.test.ts`, `tests/boss-work-panel.test.tsx`

**Interfaces:**
- Consumes: semantic state classes from Task 2.
- Produces: `anim-live-orbit`, `anim-live-sweep`, `anim-attention-glow`, `anim-state-settle`, and reduced-motion overrides.

- [ ] **Step 1: Write the failing guardrail test**

Extend architecture tests to require the new keyframes in `motion-tokens.css`, require `--boss-*` custom properties to be defined before use, and forbid inline `style=`/obsolete presentational attributes in touched TSX files.

- [ ] **Step 2: Run test to verify it fails**

Run `cd pagurus && npx vitest run tests/architecture.test.ts`; expect failure on missing keyframes/properties.

- [ ] **Step 3: Implement motion and visual language**

Add keyframes/classes to `motion-tokens.css`; rewrite `boss-work.css` with modern CSS and semantic tokens. Add reduced-motion overrides in the existing motion reset, preserving text state.

- [ ] **Step 4: Run test to verify it passes**

Run `cd pagurus && npx vitest run tests/architecture.test.ts tests/boss-work-panel.test.tsx`; expect PASS.

### Task 5: Full verification and visual QA

**Files:**
- Modify: `docs/CURRENT_STATE.md`
- Test: full Pagurus suite and manual browser check.

- [x] **Step 1: Run Pagurus checks**

Run `cd pagurus && npm run check && npm test && npm run build`; all must pass.

- [x] **Step 2: Visual QA**

Open `http://localhost:5173/?surface=agent` at the actual 1920×1080 display and at the in-app 843px viewport. Confirm: work rail left, transcript center, context overlay behavior, light/dark themes, running/attention/failed states, and reduced-motion fallback.

- [x] **Step 3: Update state doc**

Record that the Boss surface now has a desktop work rail and modern responsive layout.
