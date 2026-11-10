# Security policy

Please do not publish credentials, private user data, or an unpatched vulnerability in a public issue. Use GitHub's private vulnerability reporting for this repository when enabled, or contact the maintainers through the account profile.

Pagurus is early software. Configuration writes are limited to Conchbase's published validate/apply routes; they store bounded opaque references and v2 composition data, not secrets or executable capabilities. Pagurus does not call Conchbase `0.6.0`'s tool request/approval ledger routes, and a runtime ledger decision is never treated as client-side execution permission. Use only with a local Conchbase runtime until authenticated pairing is designed.

[ADR 0008](docs/decisions/0008-human-attention-workbench-proposal.md) proposes a future write-only SecretHandle editor. Plaintext must never enter browser storage, component state, URLs, logs, errors, the frontend bundle, or model context. The client may show handle keys, versions, status, grants, and digest-only use receipts; it must not receive a value back or hold a decryptable resolver token. No such route or component exists yet.
