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

function assertNoWriteFetchIn(source: string, label: string): void {
  expect(
    forbiddenHttpMethod.test(source),
    `${label} must not add an undocumented Runtime API write call`,
  ).toBe(false);
}

function assertApiBoundary(source: string, label: string): void {
  expect(
    source.includes("getJson('/v1/health'"),
    `${label} must keep the current health route`,
  ).toBe(true);
  expect(
    source.includes("getJson('/v1/runtime'"),
    `${label} must keep the current runtime route`,
  ).toBe(true);
  expect(source, `${label} must use a read-only fetch helper`).toMatch(readOnlyFetch);
  assertNoWriteFetchIn(source, label);
}

function assertLoopbackProxy(source: string, label: string): void {
  expect(
    source.includes("target: 'http://127.0.0.1:4318'"),
    `${label} must keep the loopback development proxy`,
  ).toBe(true);
  expect(
    nonLoopbackAddress.test(source),
    `${label} must not configure a non-loopback runtime target`,
  ).toBe(false);
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
      'Conchbase owns model execution, task state, secrets, and permission enforcement.',
      "Use Conchbase's versioned API. Never read or write its private files/database.",
      'A UI selection or installation must not bypass the runtime\'s per-tool authorization.',
      'Do not put provider/tool credentials in browser storage, frontend bundles, logs, or Git.',
      'Remote runtime pairing and configuration write operations are not implemented yet.',
      'Run `npm run check`, `npm test`, and `npm run build` after code changes.',
      'Keep `tests/repository-guardrails.test.ts` passing; update it only alongside an accepted ADR or a documented development-boundary change.',
    ]) {
      expect(agents, `AGENTS.md must keep: ${phrase}`).toContain(phrase);
    }

    const handoff = read('docs/AI_HANDOFF.md');
    expect(handoff).toMatch(/Do not tell users that Pagurus can configure an agent yet/);
    expect(handoff).toMatch(/Propose API changes there before building dependent UI/);

    const englishReadme = read('README.md');
    const chineseReadme = read('README.zh-CN.md');
    expect(englishReadme).toMatch(/Configuration workflows are planned work/);
    expect(englishReadme).toMatch(/Deterministic repository guardrail tests keep the current client and API boundaries explicit\./);
    expect(chineseReadme).toMatch(/配置工作流尚未实现/);
    expect(chineseReadme).toMatch(/确定性的仓库护栏测试会把当前客户端与 API 边界固定为可执行检查。/);
  });

  it('records the accepted development guardrail decision', () => {
    const recordsDir = 'docs/decisions';
    const files = readdirSync(path.join(repositoryRoot, recordsDir))
      .filter((file) => file.endsWith('.md'))
      .sort();
    expect(files).toEqual(['0001-ai-development-guardrails.md']);

    const record = read(`${recordsDir}/0001-ai-development-guardrails.md`);
    expect(record).toMatch(/^Status: accepted for repository development guardrails, not a public API contract\.$/m);
    expect(record).toMatch(/does not authorize configuration write routes/);
    expect(record).toMatch(/does not implement an agent loop/);
  });
});

describe('client boundaries', () => {
  it('keeps the Runtime API read-only, loopback-only, and free of private-file access', () => {
    const apiClient = read('src/shared/api/runtime.ts');
    assertApiBoundary(apiClient, 'src/shared/api/runtime.ts');
    assertLoopbackProxy(read('vite.config.ts'), 'vite.config.ts');

    const sourceFiles = listSourceFiles('src');
    expect(sourceFiles.length).toBeGreaterThan(0);
    for (const file of sourceFiles) {
      const source = read(file);
      assertNoForbiddenImportIn(source, file);
      assertNoForbiddenBrowserStorageIn(source, file);
      assertNoWriteFetchIn(source, file);
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
    const syntheticWriteFetch = ['await fetch', "('/v1/config', { method: ", "'POST'", ' });'].join('');
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
    expect(() => assertNoWriteFetchIn(syntheticWriteFetch, 'synthetic')).toThrowError(
      /must not add an undocumented Runtime API write call/,
    );
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
