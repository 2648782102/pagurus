import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(repositoryRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return sourceFiles(child);
      return entry.isFile() && /\.(?:ts|tsx)$/.test(child) ? [child] : [];
    })
    .sort();
}

function styleFiles(): string[] {
  const absoluteDir = path.join(repositoryRoot, 'src/styles');
  return readdirSync(absoluteDir)
    .filter((entry) => entry.endsWith('.css'))
    .map((entry) => path.join('src/styles', entry))
    .sort();
}

function read(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

describe('front-end architecture boundaries', () => {
  it('keeps modules small enough to review in one pass', () => {
    const oversized = sourceFiles('src')
      .map((file) => ({ file, lines: read(file).split('\n').length - 1 }))
      .filter(({ lines }) => lines > 500);
    expect(oversized, `split oversized modules:\n${oversized.map(({ file, lines }) => `${file} (${lines})`).join('\n')}`)
      .toEqual([]);
  });

  it('keeps every cascade layer small enough to review in one pass', () => {
    // ADR 0038 split the 955-line sheet into named layers. The entry point is
    // now import-only, so the ceiling applies per layer rather than to one file.
    expect(read('src/styles.css').split('\n').length - 1, 'src/styles.css must stay an import entry point')
      .toBeLessThanOrEqual(30);
    const oversized = styleFiles()
      .map((file) => ({ file, lines: read(file).split('\n').length - 1 }))
      .filter(({ lines }) => lines > 300);
    expect(oversized, `split oversized style layers:\n${oversized.map(({ file, lines }) => `${file} (${lines})`).join('\n')}`)
      .toEqual([]);
  });

  it('keeps presentation modules free of Runtime transport calls', () => {
    // Type-only imports are data shapes, not transport calls. A value import
    // from shared/api would make a presentation module own fetching.
    const transports = /import\s+(?!type\b)[^;]*?from\s+['"][^'"]*shared\/api\/[^'"]*['"]/;
    const offenders = sourceFiles('src/app')
      .concat(sourceFiles('src/shared/ui'))
      .filter((file) => transports.test(read(file)));
    expect(offenders, `presentation modules must receive typed data, not call the API:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('keeps shared modules independent of feature modules', () => {
    const offenders = sourceFiles('src/shared')
      .filter((file) => /from\s+['"][^'"]*(?:src\/)?features\//.test(read(file)));
    expect(offenders, `shared modules must not import feature modules:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps presenters from accepting an entire controller', () => {
    const offenders = sourceFiles('src/app')
      .concat(sourceFiles('src/features'))
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => /ReturnType<\s*typeof\s+use[A-Z]\w*>/.test(read(file)));
    expect(offenders, `pass explicit view fields and actions instead of a controller:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('keeps the Runtime endpoint out of hard-coded display copy', () => {
    // The development proxy follows the current worktree. A hard-coded label
    // would make a parallel console claim it is connected to the main checkout.
    const panel = read('src/features/runtime-status/RuntimeStatusPanel.tsx');
    expect(panel).toMatch(/runtimeEndpointLabel\(\)/);
    expect(panel).not.toMatch(/<code>127\.0\.0\.1:4318<\/code>/);
  });

  it('keeps the product surface free of borrowed third-party assets', () => {
    // ADR 0040 accepts interaction patterns, not another product's identity.
    // A vendor name in the shipped shell would mean we copied branding.
    const product = sourceFiles('src/agent').map((file) => ({ file, source: read(file) }));
    const borrowedIdentity = /\b(?:codex|dsh|deepseek\s*harness|workbuddy|cursor|claude)\b/i;
    const offenders = product
      .filter(({ source }) => borrowedIdentity.test(source))
      .map(({ file }) => file);
    expect(offenders, `product modules must not carry another vendor's identity:\n${offenders.join('\n')}`)
      .toEqual([]);
  });
});
