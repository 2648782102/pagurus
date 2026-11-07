# Technology baseline

This records the initial implementation choices. Revisit a choice through a short decision record when requirements change.

| Area | Baseline | State |
|---|---|---|
| UI | React and TypeScript | In use |
| Build and local development | Vite | In use |
| Runtime connection | Versioned Conchbase HTTP/JSON API, with SSE for task events | Planned; health uses a same-origin development proxy today |
| API schemas | Generated client/types from Conchbase's published contract | Planned after the Runtime API stabilizes |
| Desktop packaging | Web-first; choose a native wrapper after OS integration requirements are known | Deferred |

Pagurus is a client, not a second agent runtime. It must not read private Conchbase state files or keep provider credentials in the browser bundle.

## Deferred choices

- Desktop wrapper: compare installation, auto-start, tray, update, and platform-specific permission requirements before selecting a shell.
- Runtime discovery and pairing: keep the current development proxy loopback-only; design authenticated pairing before connecting to remote runtimes.
- UI state libraries: use component state until the console has enough shared server state to justify a dedicated cache.
