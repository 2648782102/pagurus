/**
 * The single HTTP transport for the published Conchbase Runtime API.
 *
 * Every typed client in this folder delegates here so header rules, JSON
 * encoding, abort handling, and error translation exist once. Domain modules
 * keep their own payload validators and user-facing status copy: those are
 * domain language, not transport concerns.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface JsonRequest {
  /** Omitted for GET so the request stays minimal. */
  readonly method?: HttpMethod;
  /** Pre-serialized JSON body. `undefined` means "no body at all". */
  readonly body?: string;
  readonly signal?: AbortSignal;
  readonly headers?: Readonly<Record<string, string>>;
  /** `false` for bodyless POST (cancel/retry), which must not imply a body. */
  readonly jsonContentType?: boolean;
  /**
   * Reads the error body and returns a domain error. When omitted the body is
   * never parsed, preserving the read-only status client's behaviour.
   */
  readonly httpError?: (status: number, payload: unknown) => Error | undefined;
  readonly fallbackError?: (status: number) => Error;
  readonly invalidPayload?: (path: string) => Error;
}

export class RuntimeHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Runtime returned HTTP ${status}`);
    this.name = 'RuntimeHttpError';
    this.status = status;
  }
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

function normalizeHeaders(
  headers: HeadersInit | undefined,
): Record<string, string> | undefined {
  if (headers === undefined) return undefined;
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return headers as Record<string, string>;
}

/**
 * Adapts the historical `RequestInit + signal` shape used by older clients to
 * the explicit transport request, without changing their wire behaviour.
 */
export function fromRequestInit(init: RequestInit = {}, signal?: AbortSignal): JsonRequest {
  return {
    ...(init.method === undefined ? {} : { method: init.method as HttpMethod }),
    ...(typeof init.body === 'string' ? { body: init.body } : {}),
    ...((init.signal ?? signal) === undefined ? {} : { signal: (init.signal ?? signal) as AbortSignal }),
    ...(init.headers === undefined ? {} : { headers: normalizeHeaders(init.headers) }),
    jsonContentType: init.body !== undefined,
  };
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function send(path: string, request: JsonRequest = {}): Promise<Response> {
  const {
    method,
    body,
    signal,
    headers,
    jsonContentType = body !== undefined,
  } = request;

  return fetch(path, {
    ...(method === undefined ? {} : { method }),
    headers: { Accept: 'application/json', ...(jsonContentType ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body === undefined ? {} : { body }),
    signal,
  });
}

/**
 * The historical read-only transport. It never parses an error body and never
 * sends a request body, so it stays safe for health/runtime probes.
 */
export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const response = await send(path, fromRequestInit(init, signal));
  if (!response.ok) throw new RuntimeHttpError(response.status);
  return await response.json() as T;
}

export async function requestJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  request: JsonRequest = {},
): Promise<T> {
  const {
    httpError,
    fallbackError = (status: number) => new RuntimeHttpError(status),
    invalidPayload = (failedPath: string) =>
      new Error(`Runtime returned an invalid response from ${failedPath}`),
  } = request;

  const response = await send(path, request);

  if (!response.ok) {
    const payload = httpError === undefined ? undefined : await readErrorPayload(response);
    throw httpError?.(response.status, payload) ?? fallbackError(response.status);
  }

  const payload: unknown = await response.json();
  if (!isPayload(payload)) throw invalidPayload(path);
  return payload;
}
