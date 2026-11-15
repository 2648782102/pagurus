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

function read(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

describe('front-end architecture boundaries', () => {
  it('keeps modules small enough to review in one pass', () => {
    const oversized = sourceFiles('src')
      .map((file) => ({ file, lines: read(file).split('\n').length - 1 }))
      .filter(({ file, lines }) => !file.endsWith('styles.css') && lines > 500);
    expect(oversized, `split oversized modules:\n${oversized.map(({ file, lines }) => `${file} (${lines})`).join('\n')}`)
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
});
