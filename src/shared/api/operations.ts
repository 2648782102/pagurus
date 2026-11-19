import { isRecord } from './guards.js';
import { requestJson } from './http.js';

export interface RuntimeDataInfo {
  readonly version: 1;
  readonly databasePath: string;
  readonly sizeBytes: number;
  readonly schemaVersion: number;
  readonly exists: boolean;
}

export type DiagnosticStatus = 'ok' | 'warn' | 'fail';

export interface DiagnosticCheck {
  readonly id: string;
  readonly status: DiagnosticStatus;
  readonly detail: string;
}

function isRuntimeDataInfo(value: unknown): value is RuntimeDataInfo {
  return isRecord(value)
    && value.version === 1
    && typeof value.databasePath === 'string'
    && typeof value.sizeBytes === 'number'
    && typeof value.schemaVersion === 'number'
    && typeof value.exists === 'boolean';
}

function isDiagnostics(value: unknown): value is { version: 1; checks: DiagnosticCheck[] } {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.checks)
    && value.checks.every((entry) => isRecord(entry)
      && typeof entry.id === 'string'
      && (entry.status === 'ok' || entry.status === 'warn' || entry.status === 'fail')
      && typeof entry.detail === 'string');
}

/** Where the Runtime keeps its data. Read-only, no contents. */
export async function getRuntimeData(signal?: AbortSignal): Promise<RuntimeDataInfo> {
  return requestJson('/v1/operations/data', isRuntimeDataInfo, { signal });
}

/** Bounded environment checks, already redacted by the Runtime. */
export async function getDiagnostics(signal?: AbortSignal): Promise<readonly DiagnosticCheck[]> {
  const value = await requestJson('/v1/operations/diagnostics', isDiagnostics, { signal });
  return Object.freeze([...value.checks]);
}
