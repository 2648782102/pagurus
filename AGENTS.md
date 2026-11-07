# AI contribution rules

- Read `docs/ARCHITECTURE.md` before changing the client/runtime boundary.
- Pagurus is a UI client. Task execution and permission enforcement belong to Conchbase.
- Use the versioned Runtime API; do not read or write Conchbase's private state files.
- Keep connection, loading, empty, error, and permission states explicit.
- Preserve keyboard navigation, visible focus, reduced-motion behavior, and narrow layouts.
- Never place credentials or user runtime data in the frontend bundle or repository.
- Run `npm run check` and `npm run build` after code changes.

