/**
 * The organization public surface, kept as one import path for its callers.
 *
 * - `organization-contract.ts` — versioned records, the published path list,
 *   and payload validators; no transport, no RuntimeInfo.
 * - `organization-client.ts` — typed reads and the two accepted writes.
 * - `organization-selectors.ts` — pure projections of one session payload.
 *
 * one module answers one question, and a
 * change to a session projection cannot alter a request.
 */
export * from './organization-contract.js';
export * from './organization-client.js';
export * from './organization-selectors.js';
