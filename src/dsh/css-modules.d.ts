/**
 * CSS Modules as DSH's primitives use them.
 *
 * DSH styles its atoms with `import css from './X.module.css'` and reads
 * arbitrary class keys off the result (`css.callRow`, `css.root`). Vite's
 * built-in CSS-module support provides exactly that, but TypeScript needs the
 * shape declared once, otherwise every vendored component fails to typecheck
 * with "cannot find module".
 */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
