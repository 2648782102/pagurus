/**
 * The one type `ui-primitives` needs from DSH's brand package.
 *
 * Upstream `@deepseek-ai/dsh-brand` is a branding package (logos, wordmarks,
 * colour assets) and `dsh-util-file-drag` imports a single branded-string
 * helper from it. Copying the whole brand package would drag product artwork
 * into a runtime that does not use it, so the helper is restated here with the
 * signature its call sites expect.
 */
declare const brand: unique symbol;

export type Branded<B extends string> = string & { readonly [brand]: B };
