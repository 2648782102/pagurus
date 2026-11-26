import { isRecord } from './guards.js';
import { requestJson } from './http.js';
import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';

/**
 * The Runtime's bounded, read-only workspace index.
 *
 * The picker needs candidate paths before a message is sent. The client cannot
 * walk the filesystem (the repository guardrails forbid it and it would only
 * see the browser's machine, not the Runtime's), so it asks the Runtime and
 * gets paths and sizes — never contents.
 */
export const WORKSPACE_INDEX_CAPABILITY = 'workspace-index';

export interface WorkspaceFileEntry {
  readonly path: string;
  readonly bytes: number;
  readonly directory: string;
}

export interface WorkspaceFileIndex {
  readonly version: 1;
  readonly files: readonly WorkspaceFileEntry[];
  readonly truncated: boolean;
}

export function supportsWorkspaceIndex(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WORKSPACE_INDEX_CAPABILITY);
}

function isWorkspaceFileEntry(value: unknown): value is WorkspaceFileEntry {
  return isRecord(value)
    && typeof value.path === 'string'
    && typeof value.directory === 'string'
    && Number.isInteger(value.bytes);
}

function isWorkspaceFileIndex(value: unknown): value is WorkspaceFileIndex {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.files)
    && value.files.every(isWorkspaceFileEntry)
    && typeof value.truncated === 'boolean';
}

export async function listWorkspaceFiles(
  query: string,
  signal?: AbortSignal,
): Promise<WorkspaceFileIndex> {
  const parameters = new URLSearchParams();
  if (query.trim().length > 0) parameters.set('q', query.trim());
  parameters.set('limit', '40');
  return requestJson(`/v1/workspace/files?${parameters.toString()}`, isWorkspaceFileIndex, {
    signal,
    invalidPayload: () => new Error('Runtime returned an invalid workspace file list.'),
  });
}
