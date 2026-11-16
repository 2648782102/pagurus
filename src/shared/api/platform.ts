/**
 * The platform surface, kept as one import path for its callers.
 *
 * The three sub-domains have separate authority and separate risk:
 * - `capabilities.ts` — bounded capability records; a record is not a grant.
 * - `local-source.ts` — the local Source event ledger.
 * - `secret-handles.ts` — write-only handles and digest-only use receipts.
 *
 * They share the version-2 wire rules but not a lifecycle, so each keeps its
 * own types, validators, and routes. Splitting them means a SecretHandle change
 * cannot accidentally touch a capability write. See ADR 0039.
 */
export * from './capabilities.js';
export * from './local-source.js';
export * from './secret-handles.js';
