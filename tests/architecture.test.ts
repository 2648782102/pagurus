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
    /*
     * Type-only imports are data shapes, not transport calls. A value import
     * from shared/api would make a presentation module own fetching.
     *
     * Every `.tsx` in the tree, not two directories. This rule was written for
     * `src/app` and `src/shared/ui` and then left there while the code moved
     * into `src/features` and `src/agent`: `RuntimeDataPanel` held four
     * transport calls and its own phase machine, and the test that exists to
     * forbid exactly that reported nothing, because it was not looking.
     *
     * A component may still import a pure formatter (`formatSupportBundle`,
     * `conversationKindLabel`) — those are display functions that happen to be
     * typed against the contract. The marker for a transport call is that it
     * returns a promise; anything else is a value import that a component is
     * entitled to.
     */
    /*
     * A component may import a formatter — `formatSupportBundle`,
     * `conversationKindLabel` — because those are display helpers typed against
     * the contract. What it may not import is a request, and in this codebase
     * that is exactly "returns a promise": every client function in
     * `shared/api` is `async`; no formatter is.
     *
     * The check resolves each imported name in the module it came from rather
     * than keeping a list of allowed names. A list would be an exception
     * mechanism with extra steps.
     */
    const returnsPromise = (modulePath: string, name: string): boolean => {
      const source = read(modulePath);
      return new RegExp(
        `export\\s+(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*:\\s*Promise<`,
        'm',
      ).test(source) || new RegExp(`export\\s+const\\s+${name}\\s*=\\s*async`, 'm').test(source);
    };
    const presentationFiles = sourceFiles('src/app')
      .concat(sourceFiles('src/shared/ui'))
      .concat(sourceFiles('src/features').filter((file) => file.endsWith('.tsx')))
      .concat(sourceFiles('src/agent').filter((file) => file.endsWith('.tsx')));
    const offenders = presentationFiles.filter((file) => {
      const source = read(file);
      for (const match of source.matchAll(/import\s+(?!type\b)\{([^}]*)\}\s+from\s+['"]([^'"]*shared\/api\/[^'"]*)['"]/g)) {
        const names = match[1]!
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0 && !entry.startsWith('type '))
          .map((entry) => entry.split(/\s+as\s+/)[0]!.trim());
        const module = match[2]!.replace(/^[\s\S]*shared\/api\//, 'src/shared/api/').replace(/\.js$/, '.ts');
        if (names.some((name) => returnsPromise(module, name))) return true;
      }
      return false;
    });
    expect(offenders, `presentation modules must receive typed data, not call the API:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('keeps shared modules independent of feature modules', () => {
    const offenders = sourceFiles('src/shared')
      .filter((file) => /from\s+['"][^'"]*(?:src\/)?features\//.test(read(file)));
    expect(offenders, `shared modules must not import feature modules:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps imports pointing down, one layer at a time', () => {
    /*
     * Four layers, and a module may only import from below itself:
     *
     *     app / agent   the two entries, side by side
     *     features      one product area each
     *     shared        transport, contracts, primitives
     *
     * `agent` and `app` are peers. They are the two surfaces of one build, and
     * neither owns the other: a helper both need belongs in `shared`, which is
     * what happened to `surface.ts` when both entries reached for it. Without
     * this rule that showed up as `agent → app`, which is the same shape as a
     * component importing its own page.
     */
    const allowed: Readonly<Record<string, readonly string[]>> = {
      agent: ['features', 'shared'],
      app: ['features', 'shared'],
      features: ['shared'],
      shared: [],
    };
    /*
     * Resolve the path, do not read the specifier. `../agents/x` from
     * `features/task-history` is `features/agents/x` — a sibling feature —
     * while `../shared/x` from the same file is a layer below. Only the
     * resolved path tells them apart.
     */
    const layerOf = (resolved: string): string | null => {
      const match = /^src\/([a-z]+)\//.exec(resolved);
      return match && match[1]! in allowed ? match[1]! : null;
    };
    const offenders: string[] = [];
    for (const [layer, targets] of Object.entries(allowed)) {
      for (const file of sourceFiles(`src/${layer}`)) {
        for (const match of read(file).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
          const resolved = path
            .normalize(path.join(path.dirname(file), match[1]!))
            .replace(/\.js$/, '');
          const target = layerOf(resolved);
          if (target === null) continue;
          /*
           * A file may import within its own layer — except in `features`,
           * where each directory is a separate product area. `features/a` and
           * `features/b` share a layer name but not a purpose, and one
           * importing the other is the horizontal dependency this rejects.
           */
          if (target === layer) {
            if (layer !== 'features') continue;
            /* `src/features/<area>/…` — the area is the third segment. */
            const area = (source: string): string => source.split('/')[2] ?? '';
            if (area(file) === area(resolved)) continue;
          }
          if (targets.includes(target)) continue;
          offenders.push(`${file} → ${resolved}`);
        }
      }
    }
    expect(offenders, `imports must point down, never sideways or up:\n${offenders.join('\n')}`).toEqual([]);
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

  it('pairs every primary fill with a label that can be read on it', () => {
    /*
     * Colour pairs are chosen once and then edited separately, so the pair can
     * drift apart without either value looking wrong on its own. That happened
     * here: the primary fill moved from the console's rust to the product's
     * teal, and the label stayed the light ink chosen for a dark fill — 1.75:1,
     * a button whose text is invisible.
     *
     * The rule is arithmetic rather than visual. AA for normal text is 4.5:1;
     * a filled control's label is normal text. Both themes are checked, because
     * the fill changes between them and only one was looked at.
     */
    const hex = (value: string): [number, number, number] | null => {
      const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
      if (!match) return null;
      const raw = match[1]!;
      return [
        Number.parseInt(raw.slice(0, 2), 16),
        Number.parseInt(raw.slice(2, 4), 16),
        Number.parseInt(raw.slice(4, 6), 16),
      ];
    };
    const luminance = ([r, g, b]: readonly [number, number, number]): number => {
      const channel = (value: number): number => {
        const scaled = value / 255;
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const contrast = (a: readonly [number, number, number], b: readonly [number, number, number]): number => {
      const [high, low] = [luminance(a), luminance(b)].sort((left, right) => right - left) as [number, number];
      return (high + 0.05) / (low + 0.05);
    };
    /*
     * Read a property's literal value from the block that owns it. The file is
     * split at its block boundaries rather than searched whole: the light
     * values appear first and the dark overrides later, so a plain search
     * returns the light one for both.
     */
    const darkStart = withoutComments(read('src/styles/agent-tokens.css')).indexOf("[data-agent-theme='dark']");
    const agentTokens = withoutComments(read('src/styles/agent-tokens.css'));
    const tokenValue = (name: string, dark: boolean): string | null => {
      const scoped = dark ? agentTokens.slice(darkStart) : agentTokens.slice(0, darkStart);
      const match = new RegExp(`${name}:\\s*([^;]+);`).exec(scoped);
      return match ? match[1]!.trim() : null;
    };

    /*
     * The pairs that actually ship: the accent fill and the ink chosen for it,
     * in both themes. A pair whose values are not both literal hex is skipped
     * rather than guessed at — this test guards the pair, it does not resolve
     * the cascade.
     */
    const cases: ReadonlyArray<readonly [string, string, boolean]> = [
      ['--ag-tide', '--ag-on-accent', false],
      ['--ag-tide', '--ag-on-accent', true],
    ];
    const failures: string[] = [];
    for (const [fillName, inkName, dark] of cases) {
      const fill = hex(tokenValue(fillName, dark) ?? '');
      const ink = hex(tokenValue(inkName, dark) ?? '');
      if (fill === null || ink === null) continue;
      const ratio = contrast(fill, ink);
      if (ratio < 4.5) {
        failures.push(`${dark ? 'dark' : 'light'} ${inkName} on ${fillName} = ${ratio.toFixed(2)}:1 (needs 4.5)`);
      }
    }
    expect(failures, `a filled control's label must be readable on its fill:\n${failures.join('\n')}`).toEqual([]);
  });

  it('lets the composer own its own height', () => {
    /*
     * The composer grows to 40% of the viewport in `AgentChatComposer`, and the
     * same code decides when to switch the textarea to `overflow-y: auto` — it
     * compares `scrollHeight` against *its* cap.
     *
     * A CSS `max-height` shorter than that cap makes the box stop growing while
     * the script still believes there is room, so it leaves `overflow-y:
     * hidden` and the last lines are clipped with no way to scroll to them.
     * That was 150px in `conversation.css` and 240px on `.ui-textarea`; at
     * seven lines the seventh was unreachable.
     *
     * One owner. The product composer may set a floor (`min-height`), not a
     * ceiling, and not a manual resize that the script would overwrite.
     */
    const composer = cssRules('src/styles/conversation.css')
      .filter((rule) => rule.selectors.some((selector) => /\.agent-chat-composer\s+textarea\b/.test(selector)));
    expect(composer.length, 'the composer textarea must be styled explicitly').toBeGreaterThan(0);
    /*
     * `none` is the fix, not the fault: the composer has to override the
     * `.ui-textarea` defaults. What is rejected is any real cap or a manual
     * resize, because either one fights the script.
     */
    /* Compare the declared value; a negative lookahead here matched `none`. */
    const valueOf = (body: string, property: string): string | null => {
      const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(body);
      return match ? match[1]!.trim() : null;
    };
    const offences = composer
      .filter((rule) => {
        const cap = valueOf(rule.body, 'max-height');
        const resize = valueOf(rule.body, 'resize');
        return (cap !== null && cap !== 'none') || (resize !== null && resize !== 'none');
      })
      .map((rule) => `src/styles/conversation.css:${rule.line} ${rule.body.trim().slice(0, 60)}`);
    expect(offences, `the composer's height is set in script; CSS must not cap or resize it:\n${offences.join('\n')}`)
      .toEqual([]);
  });

  it('sizes text in whole pixels', () => {
    /*
     * A half-pixel step is indistinguishable at 1x and rounds differently at
     * 2x, so it never reads as a deliberate rank — it is what a size becomes
     * when someone nudges one value instead of choosing a step. The app had
     * thirty-six of them (9.5, 10.5, 11.5, 12.5), each within a pixel of a
     * neighbour, so four steps were doing the work of one.
     *
     * The dense scale in `semantic-tokens.css` has four whole-pixel rungs now.
     * This keeps the next nudge from bringing the halves back.
     */
    /*
     * Both spellings. The `font` shorthand carries a size too, and it was the
     * one that slipped through the first version of this check: a headline at
     * `600 15.5px/1.5` read as fine because the rule only looked for
     * `font-size:`.
     */
    const halves = styleFiles().flatMap((file) =>
      [...withoutComments(read(file)).matchAll(/(?:font-size:|font:)[^;{}]*?(\d+\.\d+)px/g)]
        .map((match) => `${file}: ${match[1]}px`));
    expect(halves, `text sizes must be whole pixels:\n${halves.join('\n')}`).toEqual([]);
  });

  it('draws workspace icons from one family, not from Unicode characters', () => {
    /*
     * The navigation icons were once `⌂ ◎ ✦ ✓ ◉ ↗ ≋ ⌘ ✳ ⚙` — ten characters from
     * four different Unicode blocks. A browser picks a font per block, so at the
     * same nominal size they measured between 24px and 40px wide and read as ten
     * unrelated marks.
     *
     * The fix is a single icon family, and this guards it from drifting back:
     * the workspace definitions carry no glyphs, and the icon map is the only
     * place a workspace's symbol is decided.
     */
    const definitions = read('src/app/useWorkspace.ts');
    expect(definitions, 'workspace definitions must not carry a glyph').not.toMatch(/\bicon:\s*'/);

    const icons = read('src/app/WorkspaceIcon.tsx');
    expect(icons).toMatch(/from 'lucide-react'/);
    // Every workspace id gets an icon; the Record type enforces it at compile
    // time, so this only guards against the map being emptied or replaced.
    for (const id of ['overview', 'organization', 'agentChat', 'execution', 'agents',
      'tasks', 'work', 'capabilities', 'secrets', 'settings']) {
      expect(icons, `${id} needs an icon`).toMatch(new RegExp(`\\b${id}:\\s*\\w+`));
    }
  });

  it('takes every duration from the motion scale', () => {
    /*
     * Durations were scattered as literals — `.12s` fourteen times, plus
     * `.1s/.14s/.16s/.18s/.32s/.9s` across six files. None was wrong on its
     * own; together they meant two controls that start moving together finish
     * at different moments, which reads as one of them being slow.
     *
     * `motion-tokens.css` states four: quick, settle, travel, attention. This
     * holds transitions and animations to them. The reduced-motion overrides
     * are exempt by design — their job is to collapse every duration, so they
     * cannot reference the scale they are overriding.
     */
    const exempt = new Set(['src/styles/motion.css', 'src/styles/responsive.css']);
    const literal = /(?:transition|animation)[^;{}]*?\b\d+(?:\.\d+)?m?s\b/g;
    const offenders = styleFiles()
      .filter((file) => !exempt.has(file))
      .flatMap((file) =>
        [...withoutComments(read(file)).matchAll(literal)]
          .filter((match) => !match[0].includes('var(--motion'))
          /*
           * `0s` is not a duration to pick — it is "switch now", usually on a
           * discrete property like `visibility` that cannot interpolate. Taking
           * it from the scale would mean a visibility change waits 120ms for a
           * reason no reader could name.
           */
          .filter((match) => !/\b0m?s\b/.test(match[0]))
          .map((match) => `${file}: ${match[0].trim().slice(0, 70)}`));
    expect(offenders, `durations must come from the motion scale:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('arms the theme cross-fade for one switch, not permanently', () => {
    /*
     * Every colour on the surface is a variable, so flipping the theme repaints
     * them all in one frame. A permanent transition on colour would smooth that
     * — and would also slow every hover and every panel to the theme's duration.
     *
     * `useAgentTheme` therefore sets `data-theme-switching` for one frame plus
     * the fade and removes it. This checks the removal exists: a marker left
     * behind would silently rewrite the timing of every control on the surface.
     */
    const theme = read('src/agent/useAgentTheme.ts');
    expect(theme, 'the switch marker must be set').toMatch(/dataset\.themeSwitching = 'true'/);
    expect(theme, 'and removed again').toMatch(/delete root\.dataset\.themeSwitching/);

    const tokens = read('src/styles/agent-tokens.css');
    // The broad transition must be scoped to the marker, never global.
    const armed = /:root\[data-theme-switching\]/.test(tokens);
    expect(armed, 'the broad colour transition must be scoped to the marker').toBe(true);
  });
});
