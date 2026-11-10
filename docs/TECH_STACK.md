# Technology baseline

This records the initial implementation choices. Revisit a choice through a short decision record when requirements change.

| Area | Baseline | State |
|---|---|---|
| UI | React and TypeScript | In use |
| Build and local development | Vite | In use |
| Runtime connection | Versioned Conchbase HTTP/JSON API through a same-origin loopback development proxy | In use; phase-1 task operations poll task state and configuration revisions use explicit reads/writes |
| Runtime events | SSE with resumable event IDs | Planned after Conchbase accepts an event envelope |
| API schemas | Generated client/types from Conchbase's published contract | Planned after the Runtime API stabilizes |
| Desktop packaging | Web-first; choose a native wrapper after OS integration requirements are known | Deferred |
| Final control workbench | React panel plus version-2 typed GET/POST clients for published Conchbase `1.0.0` work and Source routes | Implemented by ADR 0010; capability-gated, no private state or execution |
| Capability directory and SecretHandle editor | React panels plus typed published `/v1/capabilities` and `/v1/secret-handles` clients | Implemented by ADR 0010; bounded records and write-only one-shot `value` submission |

Repository guardrails use Node built-ins with the existing Vitest runner and local-file assertions; they are development checks, not UI or runtime technology. See [ADR 0001](decisions/0001-ai-development-guardrails.md).

Pagurus is a client, not a second agent runtime. It must not read private Conchbase state files or keep provider credentials in the browser bundle.

## Deferred choices

- Desktop wrapper: compare installation, auto-start, tray, update, and platform-specific permission requirements before selecting a shell.
- Runtime discovery and pairing: keep the current development proxy loopback-only; design authenticated pairing before connecting to remote runtimes.
- UI state libraries: use component state until the console has enough shared server state to justify a dedicated cache.
- Real capability lifecycle, remote pairing UX, OS-managed secret custody, tool execution, and generated client types remain outside the final target; plaintext stays out of every browser surface after one-shot submission.
