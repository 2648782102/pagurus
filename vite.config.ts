/*
 * `vitest/config` re-exports Vite's config type with the `test` block, so the
 * one config file can carry both the dev server and the suite's include rule.
 * Importing from `vite` types `test` as an unknown key and fails `tsc -b`.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Which Runtime this checkout talks to.
 *
 * Kept local to this repository rather than imported from the sibling Runtime
 * checkout: the console must build from its own source, and a cross-repository
 * relative import makes a standalone clone of pagurus unbuildable.
 */
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function isMainWorktree(): boolean {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const own = git(['rev-parse', '--path-format=absolute', '--git-dir']);
  return common.length > 0 && own.length > 0 && common === own;
}

/** Mirrors scripts/worktree-env.mjs in the Runtime repository. */
function sessionPort(): number {
  if (isMainWorktree()) return 4318;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || path.basename(process.cwd());
  const slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  return 4320 + (hash % 80);
}

/**
 * The Runtime this console talks to. Defaults to the historical loopback
 * address so nothing changes for a single checkout, and honours
 * `CONCHBASE_URL` so a parallel worktree can point at its own Runtime instead
 * of silently reading the main checkout's.
 */
// The main checkout resolves to 4318; a linked worktree resolves to its own port.
const DEFAULT_RUNTIME_URL = 'http://127.0.0.1:4318';
const session = sessionPort();
const runtimeUrl = process.env.CONCHBASE_URL
  ?? (session === 4318 ? DEFAULT_RUNTIME_URL : `http://127.0.0.1:${session}`);
// A linked worktree must not collide with the main console on 5173.
const consolePort = Number(process.env.PAGURUS_PORT ?? (session === 4318 ? 5173 : 5173 + (session - 4318)));

export default defineConfig({
  plugins: [react()],
  /*
   * `vendor/dsh` is a reference tree, not a dependency: 84 packages with their
   * own tests. Vitest's default include would collect those 79 test files as
   * ours, which reports DSH's coverage as Pagurus's and fails on imports it
   * resolves through its own workspace. Only `tests/` is this project's suite.
   */
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'vendor/**', 'dist/**'],
  },
  define: {
    __PAGURUS_RUNTIME_URL__: JSON.stringify(runtimeUrl),
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * One chunk per syntax grammar.
         *
         * DSH's highlighter already imports each language with a dynamic
         * `import()`, but Vite's default chunking folded every grammar into the
         * entry chunk — 1.4 MB of parsers for languages a given conversation
         * will never mention. Splitting them back out keeps the entry small and
         * makes the load happen on the first fence of that language, which is
         * the behaviour the upstream code was written for.
         */
        manualChunks(id: string) {
          const lang = /node_modules\/@shikijs\/langs\/dist\/([^/]+)\.mjs$/.exec(id);
          if (lang) return `shiki-lang-${lang[1]}`;
          return undefined;
        },
      },
    },
  },
  server: {
    port: consolePort,
    strictPort: false,
    proxy: {
      '/v1': {
        target: runtimeUrl,
        changeOrigin: false,
      },
    },
  },
});
