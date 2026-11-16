/**
 * Small, dependency-free validators for untrusted Runtime payloads.
 *
 * They exist because every typed client has to answer the same primitive
 * questions about JSON before it can trust a domain shape. They say nothing
 * about a specific contract version; domain modules keep those validators.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** A trimmed, non-empty string of at most 240 characters. */
export function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isNullableInteger(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Rejects payloads that declare fields the current contract does not publish. */
export function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

/** A record whose `version` equals the given contract version. */
export function isVersioned<T extends string>(
  value: unknown,
  version: T,
): value is Record<string, unknown> & { version: T } {
  return isRecord(value) && value.version === version;
}
