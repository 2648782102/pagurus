export interface RuntimeHealth {
  status: string;
  service: string;
  apiVersion: number;
}

export async function getRuntimeHealth(signal?: AbortSignal): Promise<RuntimeHealth> {
  const response = await fetch('/v1/health', {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Runtime returned HTTP ${response.status}`);
  }

  return response.json() as Promise<RuntimeHealth>;
}
