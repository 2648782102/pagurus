# Roadmap

This is a direction for staged validation, not a release commitment.

## Foundation

- Connect to a local Conchbase runtime and show actionable connection status.
- Display the active configuration revision, history, validation state, and runtime capabilities.
- Generate the client from Conchbase's stable API contract.

## Configuration workflows

- Manage agent profiles, model provider references, and Skills.
- Add and inspect MCP connections, then manage per-tool enablement and grants.
- Portable profile file import/export and topology-neutral composition editing after Conchbase accepts those schemas.

## Operations (phase 1 partially implemented)

- Create, inspect, cancel, and retry one bounded model task through Conchbase's API.
- Stream task events and show approval requests.
- Inspect task history, tool calls, artifacts, and configuration revisions.
- Add secure runtime pairing and remote connection support.

## Later

- Decide on desktop packaging based on operating-system integration needs.
- Add plugin management after Conchbase defines an isolated plugin host.
