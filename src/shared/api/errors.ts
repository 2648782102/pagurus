export class UnsupportedRuntimeApiError extends Error {
  constructor(
    readonly path: string,
    readonly expectedApiVersion: number,
  ) {
    super(`Runtime API version from ${path} is not supported`);
    this.name = 'UnsupportedRuntimeApiError';
  }
}
