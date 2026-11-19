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

export interface BackupResult {
  readonly version: 1;
  readonly ok: boolean;
  readonly target: string;
  readonly sizeBytes: number;
  readonly tables: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
  readonly integrity: string;
  readonly error?: string;
}

function isBackupResult(value: unknown): value is BackupResult {
  return isRecord(value)
    && value.version === 1
    && typeof value.ok === 'boolean'
    && typeof value.target === 'string'
    && typeof value.sizeBytes === 'number'
    && Array.isArray(value.tables)
    && typeof value.integrity === 'string';
}

/** Writes one snapshot at an absolute, not-yet-existing path. */
export async function createBackup(target: string, signal?: AbortSignal): Promise<BackupResult> {
  return requestJson('/v1/operations/backup', isBackupResult, {
    method: 'POST',
    body: JSON.stringify({ target }),
    ...(signal ? { signal } : {}),
  });
}

export interface SupportBundle {
  readonly format: 'conchbase-support-bundle';
  readonly generatedAt: string;
  readonly version: string;
  readonly data: { readonly databasePath: string; readonly sizeBytes: number; readonly schemaVersion: number };
  readonly runtime: { readonly host: string; readonly port: number; readonly magpieBaseUrl: string };
  readonly checks: readonly DiagnosticCheck[];
  readonly summary: { readonly status: DiagnosticStatus; readonly nextStep: string | null };
}

function isSupportBundle(value: unknown): value is SupportBundle {
  return isRecord(value)
    && value.format === 'conchbase-support-bundle'
    && typeof value.version === 'string'
    && isRecord(value.data)
    && isRecord(value.runtime)
    && isRecord(value.summary)
    && Array.isArray(value.checks);
}

/** A redacted, copy-pasteable bundle for a support request. */
export async function getSupportBundle(signal?: AbortSignal): Promise<SupportBundle> {
  const value = await requestJson('/v1/operations/support-bundle', (input): input is { version: 1; bundle: SupportBundle } =>
    isRecord(input) && input.version === 1 && isSupportBundle(input.bundle), { signal });
  return value.bundle;
}

/** The text form a user pastes into a support request. */
export function formatSupportBundle(bundle: SupportBundle): string {
  return [
    'Conchbase support bundle',
    `generated: ${bundle.generatedAt}`,
    `version:   ${bundle.version}`,
    `data:      ${bundle.data.databasePath} (${bundle.data.sizeBytes} bytes, schema ${bundle.data.schemaVersion})`,
    `runtime:   ${bundle.runtime.host}:${bundle.runtime.port}`,
    `gateway:   ${bundle.runtime.magpieBaseUrl}`,
    '',
    'checks:',
    ...bundle.checks.map((check) => `  [${check.status}] ${check.id}: ${check.detail}`),
    '',
    `summary: ${bundle.summary.status}${bundle.summary.nextStep ? ` — ${bundle.summary.nextStep}` : ''}`,
  ].join('\n') + '\n';
}
