import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const pagurusRoot = process.cwd();
const openApiPath = path.join(pagurusRoot, '..', 'docs', 'openapi.yaml');

interface PublishedOperation {
  readonly path: string;
  readonly method: string;
}

const publishedClientOperations: readonly PublishedOperation[] = [
  { path: '/v1/health', method: 'GET' },
  { path: '/v1/runtime', method: 'GET' },
  { path: '/v1/models', method: 'GET' },
  { path: '/v1/model-catalog', method: 'GET' },
  { path: '/v1/agents', method: 'GET' },
  { path: '/v1/agents/{agentId}', method: 'GET' },
  { path: '/v1/agents/{agentId}', method: 'PATCH' },
  { path: '/v1/agents', method: 'POST' },
  { path: '/v1/agents/{agentId}/duplicate', method: 'POST' },
  { path: '/v1/agents/{agentId}/archive', method: 'POST' },
  { path: '/v1/agents/{agentId}/revisions/apply', method: 'POST' },
  { path: '/v1/agents/default', method: 'GET' },
  { path: '/v1/agents/default', method: 'PUT' },
  { path: '/v1/tasks', method: 'GET' },
  { path: '/v1/tasks', method: 'POST' },
  { path: '/v1/tasks/{taskId}', method: 'GET' },
  { path: '/v1/tasks/{taskId}/cancel', method: 'POST' },
  { path: '/v1/tasks/{taskId}/retry', method: 'POST' },
  { path: '/v1/configuration', method: 'GET' },
  { path: '/v1/configuration/revisions', method: 'GET' },
  { path: '/v1/configuration/revisions/{revisionId}', method: 'GET' },
  { path: '/v1/configuration/validate', method: 'POST' },
  { path: '/v1/configuration/apply', method: 'POST' },
  { path: '/v1/work/items', method: 'GET' },
  { path: '/v1/work/items/{workItemId}', method: 'GET' },
  { path: '/v1/work/delivery-receipts', method: 'GET' },
  { path: '/v1/work/events', method: 'GET' },
  { path: '/v1/work/items/{workItemId}/start', method: 'POST' },
  { path: '/v1/work/items/{workItemId}/stop', method: 'POST' },
  { path: '/v1/work/items/{workItemId}/complete', method: 'POST' },
  { path: '/v1/work/assignments/{assignmentId}/reconcile', method: 'POST' },
  { path: '/v1/work/delivery-receipts/{receiptId}/decision', method: 'POST' },
  { path: '/v1/sources/local/events', method: 'GET' },
  { path: '/v1/sources/local/events', method: 'POST' },
  { path: '/v1/capabilities', method: 'GET' },
  { path: '/v1/capabilities', method: 'POST' },
  { path: '/v1/secret-handles', method: 'GET' },
  { path: '/v1/secret-handles', method: 'POST' },
  { path: '/v1/secret-handles/{handleId}/rotate', method: 'POST' },
  { path: '/v1/secret-handles/{handleId}/status', method: 'POST' },
  { path: '/v1/secret-handles/{handleId}/use', method: 'POST' },
  { path: '/v1/secret-handles/use-receipts', method: 'GET' },
];

const expectedEnvelopes: readonly string[] = [
  'Health',
  'RuntimeStatus',
  'ModelList',
  'ProviderModelList',
  'AgentList',
  'AgentEnvelope',
  'TaskEnvelope',
  'TaskList',
  'ConfigurationEnvelope',
  'ConfigurationRevisionList',
  'ValidateConfigurationResponse',
  'ApplyConfigurationResponse',
  'WorkItemList',
  'WorkItemDetail',
  'WorkDeliveryReceiptList',
  'PlatformEventList',
  'LocalSourceEventList',
  'CapabilityList',
  'SecretHandleList',
  'SecretHandleUseReceiptList',
];

function parsePublishedOperations(spec: string): Set<string> {
  const operations = new Set<string>();
  const pathPattern = /^ {2}(\/v1\/[^:]+):$/gm;
  const paths = [...spec.matchAll(pathPattern)];
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index]?.[1];
    const start = paths[index]?.index ?? 0;
    const end = paths[index + 1]?.index ?? spec.length;
    const section = spec.slice(start, end);
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      if (new RegExp(`^ {4}${method}:`, 'm').test(section)) {
        operations.add(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return operations;
}

describe('published contract validation', () => {
  it('keeps the client route inventory explicit and free of invented writes', () => {
    expect(path.isAbsolute(pagurusRoot)).toBe(true);
    expect(new Set(publishedClientOperations.map(({ path, method }) => `${method} ${path}`)).size)
      .toBe(publishedClientOperations.length);
    expect(publishedClientOperations.every(({ path }) => path.startsWith('/v1/'))).toBe(true);
    expect(publishedClientOperations.some(({ path }) => path.includes('/v1/work/triggers'))).toBe(false);
    expect(publishedClientOperations.some(({ path }) => path.includes('/v1/tool-requests'))).toBe(false);
  });

  it('aligns typed-client fixtures with the paired 47-path OpenAPI when the checkout is present', () => {
    if (!existsSync(openApiPath)) return;
    const spec = readFileSync(openApiPath, 'utf8');
    const paths = [...spec.matchAll(/^ {2}(\/v1\/[^:]+):$/gm)].map((match) => match[1]);
    expect(paths.length).toBe(47);
    expect(spec).toMatch(/^  version: 1\.0\.0$/m);

    const published = parsePublishedOperations(spec);
    for (const { path, method } of publishedClientOperations) {
      expect(published.has(`${method} ${path}`), `${method} ${path} must be published`).toBe(true);
    }
    for (const schema of expectedEnvelopes) {
      expect(spec, `${schema} must be documented`).toMatch(new RegExp(`^ {4}${schema}:$`, 'm'));
    }
  });
});
