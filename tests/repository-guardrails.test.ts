import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const forbiddenPackages = ['better-sqlite3', 'sqlite3', 'openai', '@anthropic-ai/sdk', 'zustand'];
const forbiddenImport = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](node:fs|node:sqlite|better-sqlite3|sqlite3|openai|@anthropic-ai\/sdk|zustand)['"]/;
const forbiddenBrowserStorage = /\b(?:localStorage|sessionStorage|indexedDB)\b/;
const forbiddenSecretResolver = /\b(?:plaintextSecret|secretValue|resolveSecret|decryptSecret)\b/i;

function read(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function listSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(repositoryRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(relativeDir, entry.name).replaceAll(path.sep, '/');
      if (entry.isDirectory()) return listSourceFiles(child);
      return entry.isFile() && /\.(?:ts|tsx|css)$/.test(child) ? [child] : [];
    })
    .sort();
}

describe('development entry documents', () => {
  it('point coding models to the current personal-agent plan', () => {
    expect(read('AGENTS.md')).toMatch(/docs\/START_HERE\.md/);
    expect(read('docs/START_HERE.md')).toMatch(/personal Agent runtime/);
    expect(read('docs/START_HERE.md')).toMatch(/PROJECT_PLAN\.md/);
    expect(read('docs/CURRENT_STATE.md')).toMatch(/Product gaps/);
    expect(read('docs/PROJECT_PLAN.md')).toMatch(/UI0\.1/);
    expect(read('docs/PROJECT_PLAN.md')).toMatch(/UI1\.1/);
    expect(read('docs/PROJECT_PLAN.md')).toMatch(/UI3\.2/);
    expect(read('docs/DEVELOPMENT.md')).toMatch(/failing validator\/component test/);
    expect(read('docs/VALIDATION_PLAN.md')).toMatch(/SecretHandle value/);

    for (const file of [
      'docs/START_HERE.md',
      'docs/CURRENT_STATE.md',
      'docs/PROJECT_PLAN.md',
      'docs/DEVELOPMENT.md',
      'docs/ARCHITECTURE.md',
      'docs/TECH_STACK.md',
      'docs/VALIDATION_PLAN.md',
    ]) {
      expect(() => read(file)).not.toThrow();
    }
  });
});

describe('client boundaries', () => {
  it('keeps browser code away from private Runtime state and secrets', () => {
    for (const file of listSourceFiles('src')) {
      const source = read(file);
      expect(source, `${file} imports a private or unapproved dependency`).not.toMatch(forbiddenImport);
      /*
       * `src/dsh/upstream` is vendored upstream code. Its store engine offers an
       * *opt-in* localStorage persistence that this runtime never enables — the
       * word appears in the doc comment and in the branch that is only taken
       * when `persist` is passed. What this rule protects is our own code
       * reaching for browser storage, so the vendored tree is exempt here.
       */
      if (!file.startsWith('src/dsh/upstream/')) {
        expect(source, `${file} uses browser storage`).not.toMatch(forbiddenBrowserStorage);
      }
      expect(source, `${file} implements a secret resolver`).not.toMatch(forbiddenSecretResolver);
      expect(source, `${file} reads private Runtime state`).not.toMatch(/\.conchbase|runtime\.sqlite|node:sqlite|node:fs/);
    }
    expect(read('src/shared/api/http.ts')).toMatch(/export async function requestJson/);
    expect(read('src/shared/api/http.ts')).toMatch(/response\.json/);
    expect(read('vite.config.ts')).toMatch(/127\.0\.0\.1:4318/);
    expect(read('vite.config.ts')).not.toMatch(/0\.0\.0\.0|::\/0/);
  });

  it('keeps the published client contract and capability gates visible', () => {
    const api = listSourceFiles('src/shared/api').map(read).join('\n');
    expect(api).toMatch(/\/v1\/agents/);
    expect(api).toMatch(/\/v1\/tasks/);
    expect(api).toMatch(/\/v1\/agent-chat\/conversations/);
    expect(api).toMatch(/durable-work-contract/);
    expect(api).toMatch(/write-only-secret-handles/);
    expect(read('src/features/agent-chat/useAgentChatStream.ts')).toMatch(/EventSource/);
    expect(read('src/features/secrets/SecretHandlePanel.tsx')).toMatch(/type="password"/);
  });
});

/**
 * The runtime dependencies this client is allowed to ship.
 *
 * A whitelist rather than a ban list: adding anything here is a deliberate
 * decision that has to be argued for in the diff, not a side effect of running
 * an install. Each entry carries the reason it is here, because "it made the
 * icon set consistent" and "it manages state for us" are very different
 * commitments and only the first one has been made.
 */
const approvedRuntimeDependencies: Readonly<Record<string, string>> = Object.freeze({
  react: 'the view layer',
  'react-dom': 'the view layer',
  'lucide-react': 'one icon family; the Unicode glyphs it replaces came from four different fonts',
  /*
   * Required by the vendored DSH primitives: their class-name composition is
   * `clsx(...)`. Vendoring those files unchanged is more reviewable than
   * rewriting each call, and `clsx` is a 300-byte string joiner with no state,
   * no I/O, and no runtime behaviour of its own.
   */
  clsx: 'class-name composition in the vendored DSH primitives; no runtime behaviour',
  /*
   * The rest of this block is DSH's markdown pipeline, which is now what renders
   * every answer. Each entry is a parser or renderer the vendored code imports
   * directly; none of them is a state manager, a transport, or a source of
   * truth for product data, and none performs I/O on its own.
   */
  shiki: 'syntax highlighting for fenced code, used by DSH\'s code block',
  '@shikijs/langs': 'the grammar set DSH\'s highlighter loads',
  katex: 'TeX rendering for math in answers, used by DSH\'s markdown renderer',
  'mdast-util-from-markdown': 'Markdown → AST, the first step of DSH\'s renderer',
  'mdast-util-gfm': 'GFM tables, strikethrough, task lists and autolinks',
  'mdast-util-math': 'math nodes in the Markdown AST',
  'micromark-extension-gfm': 'the GFM grammar DSH parses with',
  'micromark-extension-math': 'the math grammar DSH parses with',
  'micromark-util-sanitize-uri': 'URL sanitising before a link or image is rendered',
  diff: 'diff fences in DSH\'s code block',
  anser: 'ANSI escapes in tool output, rendered as spans rather than control bytes',
  mime: 'media types for the file-drag helper DSH\'s image card imports',
  'simple-icons': 'site glyphs for link cards, from DSH\'s `SiteGlyph`',
});

describe('dependency baseline', () => {
  it('does not add an unreviewed runtime or state dependency', () => {
    const manifest = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const lock = JSON.parse(read('package-lock.json')) as { packages?: Record<string, unknown> };
    const declared = Object.keys(manifest.dependencies ?? {}).sort();
    expect(declared).toEqual(Object.keys(approvedRuntimeDependencies).sort());
    for (const name of forbiddenPackages) {
      expect(manifest.dependencies ?? {}).not.toHaveProperty(name);
      expect(manifest.devDependencies ?? {}).not.toHaveProperty(name);
      expect(Object.keys(lock.packages ?? {}).some((key) => key.endsWith(`/node_modules/${name}`))).toBe(false);
    }
  });

  it('gives every approved dependency a stated reason', () => {
    for (const [name, reason] of Object.entries(approvedRuntimeDependencies)) {
      expect(reason.trim().length, `${name} needs a reason`).toBeGreaterThan(12);
    }
  });
});
