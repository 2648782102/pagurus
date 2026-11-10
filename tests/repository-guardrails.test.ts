import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

interface PackageManifest {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

interface PackageLock {
  readonly packages?: Record<string, unknown>;
}

const forbiddenPackages: readonly string[] = [
  'better-sqlite3',
  'sqlite3',
  'openai',
  '@anthropic-ai/sdk',
  '@modelcontextprotocol/sdk',
  '@tanstack/react-query',
  'zustand',
];

const forbiddenImport = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](node:fs|node:fs\/promises|node:sqlite|better-sqlite3|sqlite3|openai|@anthropic-ai\/sdk|@modelcontextprotocol\/sdk|@tanstack\/react-query|zustand)['"]/;
const nonLoopbackAddress = /0\.0\.0\.0|::\/0/;
const readOnlyFetch = /await fetch\(path, \{\s*headers: \{ Accept: 'application\/json' \},\s*signal,\s*\}\)/;
const forbiddenBrowserStorage = /\b(?:localStorage|sessionStorage|indexedDB)\b/;
const forbiddenHttpMethod = /\bmethod:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/;
const acceptedTaskPosts = [
  "'/v1/tasks'",
  "`/v1/tasks/${encodeURIComponent(taskId)}/cancel`",
  "`/v1/tasks/${encodeURIComponent(taskId)}/retry`",
];
const acceptedConfigurationPosts = [
  "'/v1/configuration/validate'",
  "'/v1/configuration/apply'",
];
const acceptedAgentRoutes = [
  "'/v1/agents'",
  '`/v1/agents/${encodeURIComponent(agentId)}`',
  '`/v1/agents/${encodeURIComponent(agentId)}/duplicate`',
  '`/v1/agents/${encodeURIComponent(agentId)}/archive`',
  "'/v1/agents/default'",
  '`/v1/agents/${encodeURIComponent(agentId)}/revisions/apply`',
];

function read(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function listSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(repositoryRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return listSourceFiles(child);
      return entry.isFile() && /\.(?:ts|tsx|css)$/.test(child) ? [child] : [];
    })
    .sort();
}

function assertNoForbiddenImportIn(source: string, label: string): void {
  expect(
    forbiddenImport.test(source),
    `${label} must not import a private runtime file, provider, storage, or state dependency`,
  ).toBe(false);
}

function assertNoForbiddenBrowserStorageIn(source: string, label: string): void {
  expect(
    forbiddenBrowserStorage.test(source),
    `${label} must not put runtime or credential data in browser storage`,
  ).toBe(false);
}

function assertAcceptedWriteBoundary(source: string, label: string): void {
  expect(source, `${label} must use only the accepted task write helper`).toMatch(/function postJson\([\s\S]*?method: 'POST'/);
  for (const route of acceptedTaskPosts) {
    expect(source, `${label} must use ${route}`).toContain(route);
  }
  expect(source, `${label} must not invent configuration writes`).not.toMatch(/\/v1\/config(?:[^a-z]|$)/);
  expect(source, `${label} must not put credentials in requests`).not.toMatch(/Authorization|apiKey|secret/);
}

function assertAcceptedConfigurationWrites(source: string, label: string): void {
  const posts = [...source.matchAll(/method: 'POST'/g)];
  expect(posts.length, `${label} must centralize configuration POST calls`).toBe(1);
  for (const route of acceptedConfigurationPosts) {
    expect(source, `${label} must use ${route}`).toContain(route);
  }
  expect(source, `${label} must not invent another configuration route`).not.toMatch(/\/v1\/config(?:[^a-z]|$)/);
  expect(source, `${label} must not put credentials in requests`)
    .not.toMatch(/Authorization|apiKey|secretValue|credentialValue/);
}

function assertAcceptedAgentWrites(source: string, label: string): void {
  for (const route of acceptedAgentRoutes) {
    expect(source, `${label} must use ${route}`).toContain(route);
  }
  expect(source, `${label} must not put credentials in requests`)
    .not.toMatch(/Authorization|apiKey|secretValue|credentialValue/);
}

function assertTaskHistoryFeatureBoundary(source: string, label: string): void {
  expect(source, `${label} must not add a task history write`).not.toMatch(
    /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]|\/v1\/tasks\/[^'"`]+\/(?:cancel|retry)/,
  );
  expect(source, `${label} must not define a second task-list schema`).not.toMatch(
    /interface\s+(?:HistoryTask|TaskHistoryResponse)|type\s+(?:HistoryTask|TaskHistoryResponse)/,
  );
}

function assertTaskListClientBoundary(source: string, label: string): void {
  expect(source, `${label} must expose the existing task list route`).toMatch(
    /export async function listTasks\(signal\?: AbortSignal\): Promise<TaskList>/,
  );
  expect(source, `${label} must use the existing task list route`).toContain("'/v1/tasks'");
  expect(source, `${label} must keep task history on GET /v1/tasks`).toMatch(
    /return request\('\/v1\/tasks', isTaskList, \{ signal \}, signal\);/,
  );
}

function assertApiBoundary(source: string, label: string): void {
  expect(source, `${label} must keep the current health route`).toContain("getJson('/v1/health'");
  expect(source, `${label} must keep the current runtime route`).toContain("getJson('/v1/runtime'");
  expect(source, `${label} must use a read-only fetch helper`).toMatch(readOnlyFetch);
  expect(forbiddenHttpMethod.test(source), `${label} must not add a write call here`).toBe(false);
}

function assertLoopbackProxy(source: string, label: string): void {
  expect(source, `${label} must keep the loopback development proxy`)
    .toContain("target: 'http://127.0.0.1:4318'");
  expect(nonLoopbackAddress.test(source), `${label} must not configure a non-loopback runtime target`)
    .toBe(false);
}

function assertDependencyBoundaries(
  manifest: PackageManifest,
  lock: PackageLock,
  label: string,
): void {
  const packages = lock.packages;
  expect(packages, `${label} must contain a packages map`).toBeTruthy();
  const lockNames = Object.keys(packages ?? {});
  const dependencyNames = Object.keys(manifest.dependencies ?? {});
  const devDependencyNames = Object.keys(manifest.devDependencies ?? {});

  expect(
    dependencyNames.includes('react') && dependencyNames.includes('react-dom'),
    `${label} must keep the current UI runtime dependencies`,
  ).toBe(true);

  for (const name of forbiddenPackages) {
    expect(dependencyNames, `${label} must not declare ${name} as a runtime dependency`).not.toContain(name);
    expect(devDependencyNames, `${label} must not declare ${name} as a development dependency`).not.toContain(name);
    expect(
      lockNames.some((key) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`)),
      `${label} must not contain ${name} in package-lock.json`,
    ).toBe(false);
  }
}

describe('AI-first entry documents', () => {
  it('keeps the client and implemented/planned boundary explicit', () => {
    const agents = read('AGENTS.md');
    for (const phrase of [
      'built primarily by AI coding agents',
      'Read `docs/AI_HANDOFF.md` first',
      'user-managed, multiple-Agent configuration through Pagurus',
      'Conchbase owns model execution, task state, secrets, and permission enforcement.',
      "Use Conchbase's versioned API. Never read or write its private files/database.",
      'A UI selection or installation must not bypass the runtime\'s per-tool authorization.',
      'Do not put provider/tool credentials in browser storage, frontend bundles, logs, or Git.',
      'Run `npm run check`, `npm test`, and `npm run build` after code changes.',
      'Keep `tests/repository-guardrails.test.ts` passing; update it only alongside an accepted ADR or a documented development-boundary change.',
    ]) {
      expect(agents, `AGENTS.md must keep: ${phrase}`).toContain(phrase);
    }

    const handoff = read('docs/AI_HANDOFF.md');
    expect(handoff).toMatch(/Task operations use Agent-bound creation/);
    expect(handoff).toMatch(/at least two Agents/);
    expect(handoff).toMatch(/provider-neutral provider\/model identity/);
    expect(handoff).toMatch(/legacy catalog only when Agent capability is absent/);
    expect(handoff).toMatch(/legacy task operations/);
    expect(handoff).toMatch(/v1\/v2 versioned configuration revision editing/);
    expect(handoff).toMatch(/ADR 0016/);
    expect(handoff).toMatch(/no composition editor/);
    expect(handoff).toMatch(/composition-execution/);
    expect(handoff).toMatch(/ADR 0017/);
    expect(handoff).toMatch(/tool-approval-ledger/);
    expect(handoff).toMatch(/ADR 0021/);
    expect(handoff).toMatch(/ADR 0008/);
    expect(handoff).toMatch(/ADR 0009/);
    expect(handoff).toMatch(/ADR 0022/);
    expect(handoff).toMatch(/ADR 0023/);
    expect(handoff).toMatch(/never plaintext after creation/);
    expect(handoff).toMatch(/deterministic live loopback acceptance/);
    expect(handoff).toMatch(/manual\/visual screen walkthrough has since been completed/);

    const roadmap = read('docs/ROADMAP.md');
    expect(roadmap).toMatch(/ADR 0021 closes deterministic paired live-runtime acceptance/);
    expect(roadmap).toMatch(/human-attention workbench/);
    expect(roadmap).toMatch(/Implemented deterministic acceptance/);
    const validationPlan = read('docs/VALIDATION_PLAN.md');
    expect(validationPlan).toMatch(/ADR 0021's paired-runtime acceptance/);
    expect(validationPlan).toMatch(/Real-provider conformance/);
    const englishReadme = read('README.md');
    const chineseReadme = read('README.zh-CN.md');
    expect(englishReadme).toMatch(/v1\/v2 runtime configuration/);
    expect(chineseReadme).toMatch(/v1\/v2 全局运行时配置/);
    expect(englishReadme).toMatch(/provider-neutral contract/);
    expect(chineseReadme).toMatch(/供应商中立模型契约/);
    expect(englishReadme).toMatch(/ADR 0021 exercises these published clients/);
    expect(chineseReadme).toMatch(/ADR 0021 已让这些已发布的客户端/);
    expect(englishReadme).toMatch(/read-only attention workbench/);
    expect(chineseReadme).toMatch(/只读注意力工作台/);
    expect(read('src/shared/api/tasks.ts')).toMatch(/init\.body === undefined \? \{\}/);
    expect(read('tests/task-api.test.ts')).toMatch(/does not declare a JSON body for bodyless POST operations/);
  });

  it('records the accepted guardrail and task-operations decisions', () => {
    const recordsDir = 'docs/decisions';
    const files = readdirSync(path.join(repositoryRoot, recordsDir))
      .filter((file) => file.endsWith('.md'))
      .sort();
    expect(files).toEqual([
      '0001-ai-development-guardrails.md',
      '0002-phase-one-task-operations.md',
      '0003-streaming-output-progress-client.md',
      '0004-versioned-configuration-client.md',
      '0005-composition-configuration-client.md',
      '0006-agent-management-client.md',
      '0007-task-history-and-revision-comparison-client.md',
      '0008-human-attention-workbench-proposal.md',
      '0009-read-only-attention-workbench-client.md',
    ]);

    const first = read(`${recordsDir}/0001-ai-development-guardrails.md`);
    expect(first).toMatch(/^Status: accepted for repository development guardrails, not a public API contract\.$/m);
    const second = read(`${recordsDir}/0002-phase-one-task-operations.md`);
    expect(second).toMatch(/^Status: \*\*accepted for the phase-1 task operations UI/m);
    expect(second).toMatch(/configuration management remains planned work/);
    const third = read(`${recordsDir}/0003-streaming-output-progress-client.md`);
    expect(third).toMatch(/^Status: \*\*accepted for the phase-1 streaming progress UI/m);
    expect(third).toMatch(/partialOutput/);
    const fourth = read(`${recordsDir}/0004-versioned-configuration-client.md`);
    expect(fourth).toMatch(/^Status: \*\*accepted for the Conchbase 0\.4\.0 configuration revision UI/m);
    expect(fourth).toMatch(/schemaVersion: 1/);
    const fifth = read(`${recordsDir}/0005-composition-configuration-client.md`);
    expect(fifth).toMatch(/^Status: \*\*accepted for the Conchbase 0\.5\.0 v1\/v2 configuration revision UI/m);
    expect(fifth).toMatch(/composition-execution/);
    const sixth = read(`${recordsDir}/0006-agent-management-client.md`);
    expect(sixth).toMatch(/^Status: \*\*accepted for the Conchbase 0\.8\.0 Agent Runtime API/m);
    const seventh = read(`${recordsDir}/0007-task-history-and-revision-comparison-client.md`);
    expect(seventh).toMatch(/^Status: \*\*accepted for the Pagurus read-only task history and revision comparison slice\*\*$/m);
    expect(seventh).toMatch(/Magpie remains a compatibility adapter/);
    expect(seventh).toMatch(/Do not add a Runtime route/);
    expect(seventh).toMatch(/Do not add SSE/);
    const eighth = read(`${recordsDir}/0008-human-attention-workbench-proposal.md`);
    expect(eighth).toMatch(/^Status: \*\*proposed, not accepted as a client contract\*\*$/m);
    expect(eighth).toMatch(/write-only SecretHandle editor/);
    expect(eighth).toMatch(/must never display a plaintext value/);
    const ninth = read(`${recordsDir}/0009-read-only-attention-workbench-client.md`);
    expect(ninth).toMatch(/^Status: \*\*accepted for the Conchbase 0\.9\.0 durable-work contract\*\*$/m);
    expect(ninth).toMatch(/GET \/v1\/work\/items/);
    expect(ninth).toMatch(/POST \/v1\/work\/triggers/);
  });
});

describe('client boundaries', () => {
  it('keeps only accepted write routes, loopback proxy, and no private-file access', () => {
    assertApiBoundary(read('src/shared/api/runtime.ts'), 'src/shared/api/runtime.ts');
    assertAcceptedWriteBoundary(read('src/shared/api/tasks.ts'), 'src/shared/api/tasks.ts');
    assertAcceptedConfigurationWrites(
      read('src/shared/api/configuration.ts'),
      'src/shared/api/configuration.ts',
    );
    assertAcceptedAgentWrites(read('src/shared/api/agents.ts'), 'src/shared/api/agents.ts');
    assertTaskListClientBoundary(read('src/shared/api/tasks.ts'), 'src/shared/api/tasks.ts');
    assertLoopbackProxy(read('vite.config.ts'), 'vite.config.ts');

    for (const file of listSourceFiles('src')) {
      const source = read(file);
      assertNoForbiddenImportIn(source, file);
      assertNoForbiddenBrowserStorageIn(source, file);
      expect(source, `${file} must not implement an unaccepted secret path`).not.toMatch(
        /SecretHandle|plaintextSecret|secretValue|resolveSecret|decryptSecret/i,
      );
    }

    const workClient = read('src/shared/api/work.ts');
    expect(workClient).toMatch(/durable-work-contract/);
    expect(workClient).toMatch(/'\/v1\/work\/items'/);
    expect(workClient).toMatch(/'\/v1\/work\/delivery-receipts'/);
    expect(workClient).not.toMatch(/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]|\/v1\/work\/triggers/);
    expect(forbiddenHttpMethod.test(workClient), 'work client must not add writes').toBe(false);
    const workFeature = read('src/features/work/useAttentionWorkbench.ts');
    expect(workFeature).toMatch(/supportsDurableWorkContract/);
    expect(workFeature).not.toMatch(/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);

    assertTaskHistoryFeatureBoundary(
      read('src/features/task-history/useTaskHistory.ts'),
      'src/features/task-history/useTaskHistory.ts',
    );
    assertTaskHistoryFeatureBoundary(
      read('src/features/task-history/TaskHistoryPanel.tsx'),
      'src/features/task-history/TaskHistoryPanel.tsx',
    );

    const configurationSource = read('src/shared/api/configuration.ts');
    expect(configurationSource).toMatch(/schemaVersion: 2/);
    expect(configurationSource).toMatch(/ConfigurationComposition/);
    expect(configurationSource).not.toMatch(/planner|researcher|reviewer|orchestrator|three[- ]layer|layer[_-]?[123]/i);
    const panelSource = read('src/features/configuration/ConfigurationPanel.tsx');
    expect(panelSource).toMatch(/schemaVersion 1 或 2/);
    expect(panelSource).not.toMatch(/可视化组合编辑器|Agent 层级|三层/i);
    for (const file of listSourceFiles('src')) {
      expect(read(file), `${file} must not call Conchbase tool ledger routes`).not.toMatch(/\/v1\/tool-requests/);
      expect(read(file), `${file} must not hardcode a canonical topology`).not.toMatch(/Router|Worker|three-layer|layered|hierarchy/i);
    }
  });

  it('does not silently accept runtime adapters or state frameworks', () => {
    const manifest = JSON.parse(read('package.json')) as PackageManifest;
    const lock = JSON.parse(read('package-lock.json')) as PackageLock;
    assertDependencyBoundaries(manifest, lock, 'package manifests');
  });

  it('rejects representative boundary violations', () => {
    const syntheticPrivateImport = ['import fs ', "from 'node:fs';"].join('');
    const syntheticBrowserStorage = ['const value = ', 'localStorage', ".getItem('secret');"].join('');
    const syntheticConfigWrite = ['method: ', "'POST'", ", '/v1/config'"].join('');
    const syntheticNonLoopbackProxy = [
      'server: { proxy: {',
      " '/v1': { target: '",
      'http://0.0.0.0:4318',
      "' } } }",
    ].join('');
    const manifest: PackageManifest = {
      dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      devDependencies: { '@modelcontextprotocol/sdk': '2.0.0' },
    };
    const lock: PackageLock = {
      packages: { '': {}, 'node_modules/zustand': {} },
    };

    expect(() => assertNoForbiddenImportIn(syntheticPrivateImport, 'synthetic')).toThrowError(
      /must not import a private runtime file/,
    );
    expect(() => assertNoForbiddenBrowserStorageIn(syntheticBrowserStorage, 'synthetic')).toThrowError(
      /must not put runtime or credential data in browser storage/,
    );
    expect(forbiddenHttpMethod.test(syntheticConfigWrite)).toBe(true);
    expect(() => assertLoopbackProxy(syntheticNonLoopbackProxy, 'synthetic')).toThrowError(
      /must keep the loopback development proxy/,
    );
    expect(() => assertDependencyBoundaries(manifest, { packages: {} }, 'synthetic')).toThrowError(
      /must not declare @modelcontextprotocol\/sdk as a development dependency/,
    );
    expect(() => assertDependencyBoundaries(
      { dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' } },
      lock,
      'synthetic',
    )).toThrowError(/must not contain zustand in package-lock.json/);
  });
});
