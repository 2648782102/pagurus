# Security policy

Please do not publish credentials, private user data, or an unpatched vulnerability in a public issue. Use GitHub's private vulnerability reporting for this repository when enabled, or contact the maintainers through the account profile.

Pagurus uses only Conchbase's published routes. Configuration, work-control,
capability, and SecretHandle writes are explicit and capability-gated. Pagurus
does not call private Runtime files or database state, and a Runtime decision is
never treated as client-side execution permission.

The write-only editor accepts one sensitive value through a password input,
clears it immediately after submission, and never reads it back. Plaintext must
never enter browser storage, rendered DOM, URLs, logs, errors, the frontend
bundle, or model context. The client shows only opaque handle metadata,
timestamps, and digest-only receipts.
