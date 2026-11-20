import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

/**
 * Strip comments so prose that mentions a token does not count as a use.
 *
 * Newlines inside a comment are kept, because rule checks report a line number
 * and a collapse would point at the wrong rule.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''));

function read(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

/** The scope the product surface renders inside, in either theme. */
const PRODUCT_SCOPE = /\.agent-app(?:-blocked)?\b/;

/**
 * Names of the custom properties a rule declares, without the `--` prefix so
 * they can be compared against the identifiers inside `var(--…)`.
 */
function declaredBy(rule: CssRule): string[] {
  /*
   * The `;` is a lookbehind, not part of the match. Consuming it would stop
   * back-to-back declarations from matching: every second custom property in a
   * block would be skipped.
   */
  return [...rule.body.matchAll(/(?<=^|;)\s*--([\w-]+)\s*:/g)].map((match) => match[1]!);
}

/**
 * The console-only values a product-facing rule must not read.
 *
 * Decision rule: a value declared on the console entry is off-limits unless the
 * product surface adopts it explicitly — by re-declaring it under `.agent-app`,
 * or by aliasing it from a product-scoped block, the way `--font-code` and
 * `--radius-control` replace the console `--font-mono` and `--radius-md`.
 *
 * That makes one test cover three different failures without a hand-kept list:
 * a colour that was never themed (`--steel` resolving to light teal on a
 * near-black ground), a seam colour left behind when its partner was themed
 * (`--rust-wash`), and the product borrowing the console's layout grid
 * (`--content-width`, `--rail-width`), which differ between the two surfaces
 * by design. A value stops being flagged the moment it is properly adopted.
 */
function unthemedPalette(): Set<string> {
  const rules = styleFiles().flatMap(cssRules);
  const declared = new Set(
    rules
      .filter((rule) => rule.file === 'src/styles/tokens.css')
      .filter((rule) => rule.selectors.includes(':root'))
      .flatMap(declaredBy),
  );

  for (const rule of rules) {
    if (!rule.selectors.some((selector) => PRODUCT_SCOPE.test(selector))) continue;
    for (const name of declaredBy(rule)) declared.delete(name);
    /*
     * `--font-code: var(--font-mono)` adopts the console value on purpose.
     * Only a custom property declaration counts: matching any `: var(--x)`
     * would let `border-color: var(--paper)` exempt the very value it leaks,
     * and the guard would pass its own violations.
     */
    for (const match of rule.body.matchAll(/(?<=^|;)\s*--[\w-]+\s*:\s*var\(--([\w-]+)\)\s*;/g)) {
      declared.delete(match[1]!);
    }
  }

  return declared;
}

/**
 * Every file the product surface can load, found by following relative imports
 * from `src/agent`. A file-name pattern would miss `conversation.css`, whose
 * rules reach the product through `AgentChatThread`, and it would miss the
 * `shared/ui` primitives the product chrome renders.
 */
function productModules(): string[] {
  const seen = new Set<string>();
  const queue = sourceFiles('src/agent');
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of read(file).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const base = path.normalize(path.join(path.dirname(file), match[1]!)).replace(/\.js$/, '');
      for (const extension of ['.tsx', '.ts']) {
        const candidate = `${base}${extension}`;
        if (!seen.has(candidate) && existsSync(path.join(repositoryRoot, candidate))) queue.push(candidate);
      }
    }
  }
  return [...seen].sort();
}

interface CssRule {
  readonly file: string;
  readonly line: number;
  readonly selectors: readonly string[];
  readonly body: string;
}

/**
 * Flat CSS reader. Comments are stripped first so prose that quotes a
 * declaration cannot trip a check, and `@`-blocks are skipped so a media query
 * or keyframe wrapper is not mistaken for a selector.
 */
function cssRules(relativePath: string): CssRule[] {
  const source = withoutComments(read(relativePath));
  const rules: CssRule[] = [];
  let buffer = '';
  let index = 0;

  while (index < source.length) {
    const character = source[index]!;
    if (character === '{') {
      const header = buffer.trim();
      buffer = '';
      if (header.startsWith('@')) {
        index += 1;
        continue;
      }
      const close = source.indexOf('}', index);
      rules.push({
        file: relativePath,
        line: source.slice(0, index).split('\n').length,
        selectors: header.split(',').map((selector) => selector.trim()).filter(Boolean),
        body: source.slice(index + 1, close),
      });
      index = close + 1;
      continue;
    }
    if (character === '}') {
      buffer = '';
      index += 1;
      continue;
    }
    buffer += character;
    index += 1;
  }

  return rules;
}

/** Class names a stylesheet declares. Derived from selectors, never from prose. */
function declaredClasses(rules: readonly CssRule[]): Set<string> {
  const names = new Set<string>();
  for (const rule of rules) {
    for (const selector of rule.selectors) {
      for (const match of selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) names.add(match[1]!);
    }
  }
  return names;
}

/** State modifiers ride along on any block, so they never identify a surface. */
const STATE_MODIFIER = /^(?:is|has)-/;

/**
 * The class names the product surface can actually render.
 *
 * Read through every string and template literal in the product module
 * closure, then intersected with what the stylesheets declare. Indirect on
 * purpose: parsing `className` alone misses `cx('ui-button', …)` in the shared
 * primitives, and it misses template interpolation — `agent-chat-state-${…}`
 * renders classes that appear nowhere in the source as a whole word.
 */
function productClasses(): Set<string> {
  const declared = declaredClasses(styleFiles().flatMap(cssRules));
  const reachable = new Set<string>();
  const prefixes = new Set<string>();

  for (const file of productModules()) {
    for (const match of read(file).matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
      const literal = match[1] ?? match[2] ?? match[3] ?? '';
      for (const segment of literal.split(/\$\{[^}]*\}/)) {
        for (const token of segment.match(/[A-Za-z][\w-]*/g) ?? []) {
          if (declared.has(token)) reachable.add(token);
          /*
           * A template prefix implies every declared class under it. Only a
           * namespaced prefix does: `agent-chat-state-` and `ui-button-` each
           * name one family, while `status-` is a bare word both surfaces
           * share, and matching it would drag console-only classes like
           * `status-dot` into scope.
           */
          else if (token.endsWith('-') && token.slice(0, -1).includes('-')) prefixes.add(token);
        }
      }
    }
  }

  for (const name of declared) {
    if ([...prefixes].some((prefix) => name.startsWith(prefix))) reachable.add(name);
  }
  return reachable;
}

/**
 * Whether a selector can style the product surface.
 *
 * Every selector in a comma list counts, because one declaration block applies
 * to all of them. Every compound counts too, because a product ancestor still
 * paints inside the product — `.agent-chat-thread .console-note` lands on the
 * dark surface even though its rightmost class belongs to the console.
 */
function reachesProduct(selectors: readonly string[], product: ReadonlySet<string>): boolean {
  return selectors.some((selector) =>
    [...selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)]
      .map((match) => match[1]!)
      .filter((name) => !STATE_MODIFIER.test(name))
      .some((name) => product.has(name)));
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
    // The entry point is
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
    // the implementation accepts interaction patterns, not another product's identity.
    // A vendor name in the shipped shell would mean we copied branding.
    const product = sourceFiles('src/agent').map((file) => ({ file, source: read(file) }));
    const borrowedIdentity = /\b(?:codex|dsh|deepseek\s*harness|workbuddy|cursor|claude)\b/i;
    const offenders = product
      .filter(({ source }) => borrowedIdentity.test(source))
      .map(({ file }) => file);
    expect(offenders, `product modules must not carry another vendor's identity:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('keeps the reading column centred at a predictable width', () => {
    // A `ch`-based measure depends on the
    // root font size and came out far narrower than intended, which read as a
    // column stuck to the left of a wide window. Assert the unit, not the pixel
    // value, so the intent survives a font change.
    const tokens = read('src/styles/agent-tokens.css');
    const measure = /--ag-measure:\s*([^;]+);/.exec(tokens)?.[1]?.trim() ?? '';
    expect(measure, 'the reading measure must be a length, not a ch-unit').toMatch(/rem|px$/);

    const chat = read('src/styles/agent-chat.css');
    // Both the thread and the composer must use the same symmetric padding.
    const symmetric = /max\(24px, calc\(\(100% - var\(--measure-reading\)\) \/ 2\)\)/g;
    expect((chat.match(symmetric) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('disables motion centrally instead of per file', () => {
    // Looping animations and colour transitions exist in several layers, and
    // per-file opt-outs drifted. One reduced-motion block must cover them all.
    const motion = read('src/styles/motion.css');
    expect(motion).toMatch(/prefers-reduced-motion/);
    expect(motion).toMatch(/animation-duration/);
    expect(motion).toMatch(/transition-duration/);

    // It has to be imported last, or later layers would win the cascade.
    const entry = read('src/styles.css');
    const imports = [...entry.matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(imports.at(-1)).toBe('./styles/motion.css');
  });

  it('keeps the product surface on semantic tokens, and free of !important', () => {
    /*
     * The agent surface shares class names with the console panel, but the
     * palette is re-themed for the product only where `agent-tokens.css` says
     * so. A rule that reaches the product and reads an unthemed entry resolves
     * to the light value — which is how four `!important` activity colours
     * painted light-theme red on a near-black ground.
     *
     * Scope is decided per rule, not per file: the surface a rule paints is a
     * property of its selector, and the shared sheets mix both. `conversation.css`
     * is imported once and serves the console panel and the product chat alike.
     */
    const product = productClasses();
    const unthemed = unthemedPalette();
    const offenders = styleFiles()
      .flatMap(cssRules)
      .filter((rule) => reachesProduct(rule.selectors, product))
      .filter((rule) => [...rule.body.matchAll(/var\(--([\w-]+)\)/g)]
        .some((match) => unthemed.has(match[1]!)))
      .map((rule) => `${rule.file}:${rule.line} ${rule.selectors.join(', ')}`);
    expect(offenders, `product-facing rules must use semantic tokens, not the palette:\n${offenders.join('\n')}`)
      .toEqual([]);

    /*
     * `!important` is required in exactly one place: a reduced-motion override
     * has to beat every animation and transition declared elsewhere. Anywhere
     * else it means two layers are fighting over the same selector.
     */
    const motionExempt = new Set(['src/styles/motion.css', 'src/styles/responsive.css']);
    const important = styleFiles()
      .filter((file) => !motionExempt.has(file))
      .filter((file) => /!important/.test(withoutComments(read(file))));
    expect(important, `no layer outside reduced-motion may need !important:\n${important.join('\n')}`).toEqual([]);
  });

  it('defines every custom property a stylesheet references', () => {
    /*
     * An undefined custom property does not fall back to a default — it makes
     * the whole declaration invalid. Six such references had accumulated
     * (`--border-subtle`, `--space-2/4`, `--success`, `--surface`,
     * `--surface-sunken`), so the first-run card rendered with no border and no
     * spacing at all. It looked "a bit tight" rather than broken.
     */
    const defined = new Set<string>();
    for (const file of styleFiles()) {
      for (const match of withoutComments(read(file)).matchAll(/^\s*(--[\w-]+)\s*:/gm)) defined.add(match[1]!);
    }
    const missing = styleFiles().flatMap((file) =>
      [...withoutComments(read(file)).matchAll(/var\((--[\w-]+)/g)]
        .filter((match) => !defined.has(match[1]!))
        .map((match) => `${file}: ${match[1]}`));
    expect(missing, `every referenced custom property must be defined:\n${missing.join('\n')}`).toEqual([]);
  });
});
