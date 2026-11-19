/**
 * A small, lossless reading of a plain-text answer.
 *
 * The Runtime publishes an answer as one string. A model reply in practice
 * contains fenced code, bullet lists, numbered steps, and occasional headings,
 * and rendering all of it as pre-wrapped text makes a long answer hard to scan.
 *
 * This parser recognises the constructs the published text already contains and
 * nothing more: it never invents content, never executes markup, and falls back
 * to plain text for anything it does not understand. Everything it emits is
 * rendered as React text, so an answer cannot inject markup.
 */

export type AnswerBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string; readonly language: string | null }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: 'quote'; readonly text: string }
  | { readonly kind: 'rule' }
  | {
    readonly kind: 'table';
    readonly head: readonly string[];
    readonly rows: readonly (readonly string[])[];
  };

/**
 * An inline run of text.
 *
 * Models routinely emit `**bold**` and `` `code` `` inside a sentence. Rendering
 * the markers literally is worse than not supporting them at all — the reader
 * sees asterisks where an emphasis was intended — so the spans are recognised
 * and rendered as elements. Only these two are supported: they are what plain
 * model output actually contains, and every span is rendered as React text.
 */
export type AnswerSpan =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly text: string }
  | { readonly kind: 'strike'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly href: string };

/**
 * Splits a line into text, bold, and inline-code spans.
 *
 * Code is matched first: a `**` inside backticks is literal code, not bold.
 */
export function parseSpans(text: string): readonly AnswerSpan[] {
  const spans: AnswerSpan[] = [];
  /*
   * Order matters: code is matched before emphasis so a `**` inside backticks
   * stays literal, and a link is matched before its label's emphasis so the
   * href cannot be mistaken for prose. Everything is rendered as React text,
   * so none of this can inject markup.
   */
  const pattern = /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let scanned = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > scanned) spans.push({ kind: 'text', text: text.slice(scanned, start) });
    if (match[1] !== undefined) spans.push({ kind: 'code', text: match[1] });
    else if (match[2] !== undefined && match[3] !== undefined) {
      // Only http(s) and same-document links survive; anything else (javascript:,
      // data:) is rendered as its label so a model cannot smuggle a scheme.
      const href = match[3];
      if (/^https?:\/\//i.test(href) || href.startsWith('#')) spans.push({ kind: 'link', text: match[2], href });
      else spans.push({ kind: 'text', text: match[2] });
    }
    else if (match[4] !== undefined) spans.push({ kind: 'strong', text: match[4] });
    else if (match[5] !== undefined) spans.push({ kind: 'strong', text: match[5] });
    else if (match[6] !== undefined) spans.push({ kind: 'strike', text: match[6] });
    else if (match[7] !== undefined) spans.push({ kind: 'emphasis', text: match[7] });
    else if (match[8] !== undefined) spans.push({ kind: 'emphasis', text: match[8] });
    scanned = start + match[0].length;
  }
  if (scanned < text.length) spans.push({ kind: 'text', text: text.slice(scanned) });
  return spans.length > 0 ? spans : [{ kind: 'text', text }];
}

const FENCE = /^```([\w+#.-]*)\s*$/;
const ORDERED_ITEM = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/;
const BULLET_ITEM = /^\s{0,3}[-*+]\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
/** A table row: `| a | b |` or `a | b`, with optional outer pipes. */
const TABLE_DIVIDER = /^\s{0,3}\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/;

/** Splits one table row into trimmed cells, dropping the optional outer pipes. */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Splits the last list item if a closing sentence was appended to it.
 *
 * The guard is that the item ends a sentence before the break: an item that is
 * merely long, or that wraps without punctuation, must stay whole. Mutates the
 * supplied items in place and returns the trailing prose, if any.
 */
function liftTrailingProse(items: string[]): string | null {
  const lastIndex = items.length - 1;
  const item = items[lastIndex];
  if (item === undefined) return null;
  const match = /([。；;！!？?])\s+/.exec(item);
  if (!match) return null;
  const cut = match.index + 1;
  const trailing = item.slice(cut).trim();
  if (trailing.length === 0) return null;
  items[lastIndex] = item.slice(0, cut);
  return trailing;
}

/**
 * Splits an answer into blocks.
 *
 * Blank lines end a paragraph but not a list: lists continue across spacing,
 * which is how people write them.
 */
export function parseAnswer(body: string): readonly AnswerBlock[] {
  const lines = splitInlineFences(body.replace(/\r\n?/g, '\n'));
  const blocks: AnswerBlock[] = [];
  let index = 0;

  const flushParagraph = (buffer: string[]) => {
    const text = buffer.join('\n').trim();
    if (text.length > 0) blocks.push({ kind: 'paragraph', text });
    buffer.length = 0;
  };

  const paragraph: string[] = [];

  while (index < lines.length) {
    const line = lines[index]!;

    // Fenced code keeps its own newlines and is never trimmed internally.
    const fence = FENCE.exec(line);
    if (fence) {
      flushParagraph(paragraph);
      const language = fence[1] ?? '';
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s{0,3}```\s*$/.test(lines[index]!)) {
        body.push(lines[index]!);
        index += 1;
      }
      // Skip the closing fence if the answer has one; an unterminated fence
      // still renders what was published.
      if (index < lines.length) index += 1;
      blocks.push({ kind: 'code', text: body.join('\n'), language: language.length > 0 ? language : null });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph(paragraph);
      blocks.push({ kind: 'heading', text: heading[2]! });
      index += 1;
      continue;
    }

    // A horizontal rule must be checked before list items: `---` also matches
    // the bullet pattern with an empty body.
    if (RULE.test(line)) {
      flushParagraph(paragraph);
      blocks.push({ kind: 'rule' });
      index += 1;
      continue;
    }

    /*
     * A table is a header row immediately followed by a divider row. Both must
     * agree on column count; otherwise the lines are ordinary prose and stay
     * that way rather than being guessed into a table.
     */
    if (line.includes('|') && index + 1 < lines.length && TABLE_DIVIDER.test(lines[index + 1]!)) {
      const head = splitTableRow(line);
      const divider = splitTableRow(lines[index + 1]!);
      if (head.length > 1 && head.length === divider.length) {
        flushParagraph(paragraph);
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length) {
          const candidate = lines[index]!;
          if (candidate.trim().length === 0 || !candidate.includes('|')) break;
          const cells = splitTableRow(candidate);
          if (cells.length !== head.length) break;
          rows.push(cells);
          index += 1;
        }
        blocks.push({ kind: 'table', head, rows });
        continue;
      }
    }

    const ordered = ORDERED_ITEM.exec(line);
    const bullet = ordered ? null : BULLET_ITEM.exec(line);
    if (ordered || bullet) {
      flushParagraph(paragraph);
      const isOrdered = ordered !== null;
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index]!;
        const nextOrdered = ORDERED_ITEM.exec(current);
        const nextBullet = isOrdered ? null : BULLET_ITEM.exec(current);
        if (isOrdered && !nextOrdered) break;
        if (!isOrdered && !nextBullet) break;
        items.push((isOrdered ? nextOrdered![2]! : nextBullet![1]!).trim());
        index += 1;
      }
      // A closing sentence often follows the last item on the same line: "…约
      // 定频率。 如果你告诉我场景…". That trailing text is prose, not part of the
      // item, so it is lifted out once the item has already ended a sentence.
      const trailing = liftTrailingProse(items);
      blocks.push({ kind: 'list', ordered: isOrdered, items });
      if (trailing !== null) blocks.push({ kind: 'paragraph', text: trailing });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flushParagraph(paragraph);
      const quoted: string[] = [quote[1] ?? ''];
      index += 1;
      while (index < lines.length) {
        const next = QUOTE.exec(lines[index]!);
        if (!next) break;
        quoted.push(next[1] ?? '');
        index += 1;
      }
      blocks.push({ kind: 'quote', text: quoted.join('\n').trim() });
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph(paragraph);
      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph(paragraph);
  return blocks;
}

/**
 * Puts a line break around a fence that sits mid-line.
 *
 * Models frequently publish a whole answer as one line: prose, then ```bash,
 * then the code, then a closing ```, then more prose. A line-oriented parser
 * would render that fence as literal backticks, so every fence becomes its own
 * line first. Only fence markers move; the text between them is untouched apart
 * from trimming the spaces that surrounded the marker.
 */
function splitInlineFences(body: string): string[] {
  const out: string[] = [];
  let open = false;
  for (const line of body.split('\n')) {
    if (!line.includes('```')) {
      // A model that emits the whole answer on one line also emits its list
      // markers inline: "1. … 2. … 3. …". Break before a later marker so each
      // step becomes its own line. Only occurrences that follow sentence
      // punctuation are split, so "版本 1.2" stays intact.
      out.push(...splitInlineListMarkers(line));
      continue;
    }
    for (const part of line.split(/(```[\w+#.-]*)/)) {
      if (part.length === 0) continue;
      if (part.startsWith('```')) {
        // An opening fence carries a language; a bare one closes the block.
        open = part.trim().length > 3 ? true : !open;
        out.push(part.trim());
      } else if (open) {
        // Inside a fence this is code. Only the single space that separated it
        // from either fence marker is padding; deeper indentation is content.
        out.push(part.replace(/^\s/, '').replace(/\s$/, ''));
      } else {
        out.push(part.replace(/^\s+|\s+$/g, ''));
      }
    }
  }
  return out;
}

/**
 * Splits "1. … 2. …" and "• … • …" that appear mid-sentence.
 *
 * The guard is punctuation before the marker: a numbered step in prose follows
 * a full stop or a semicolon, while a version string does not.
 */
function splitInlineListMarkers(line: string): string[] {
  return line
    // A colon introduces a list just as a full stop does: "建议： 1. …".
    .replace(/([:：])\s+(?=\d{1,3}[.)]\s)/g, '$1\n')
    // A later ordered marker that starts a new sentence.
    .replace(/([。；;！!？?.)）])\s+(?=\d{1,3}[.)]\s)/g, '$1\n')
    // A later bullet, which is unambiguous once a sentence has ended.
    .replace(/([。；;！!？?.)）])\s+(?=[-*+]\s)/g, '$1\n')
    .split('\n');
}

/**
 * True when the answer has structure worth rendering as blocks.
 *
 * A single paragraph stays a paragraph: wrapping one sentence in block markup
 * adds nodes without making anything easier to read.
 */
export function hasBlockStructure(blocks: readonly AnswerBlock[]): boolean {
  return blocks.some((block) => block.kind !== 'paragraph');
}
