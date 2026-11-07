# Contributing

Pagurus is the console client for Conchbase. Keep runtime state and permission decisions in Conchbase; use the versioned API for all runtime operations.

Before opening a pull request:

1. Keep UI state distinct from runtime state.
2. Include loading, disconnected, and error states for runtime-backed screens.
3. Preserve keyboard access, visible focus, and narrow-screen layouts.
4. Document user-visible API or permission effects.
5. Run `npm run check`, `npm test`, and `npm run build`.

Do not commit credentials, user data, or local runtime profiles.
