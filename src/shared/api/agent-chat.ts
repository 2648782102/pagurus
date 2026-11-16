/**
 * The Agent Chat public surface, kept as one import path for its callers.
 *
 * The implementation lives in three modules with different lifetimes:
 * - `agent-chat-contract.ts` — versioned types, payload validators, and the
 *   published path list; it has no transport dependency.
 * - `agent-chat-client.ts` — typed HTTP reads and writes over the shared
 *   transport.
 * - `agent-chat-stream.ts` — the resumable SSE connection.
 *
 * Splitting them keeps a change to, say, stream reconnection from touching the
 * payload validators or the conversation list query.
 */
export * from './agent-chat-contract.js';
export * from './agent-chat-client.js';
export * from './agent-chat-stream.js';
