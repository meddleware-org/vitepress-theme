# CLAUDE.md — @meddleware/vitepress-theme

The VitePress theme and site config shared by docs-site and dev-site (and any later VitePress site). Source is `src/`; only
`config.js` is built (its types, into `dist/`).

## Invariants

- **Source ships as source, except the config.** A theme is bundled by VitePress's own Vite, which compiles `.ts` and `.vue` from
  `node_modules` when the package is in `ssr.noExternal` (`baseConfig` puts every `@meddleware/*` there). The config is loaded by
  Node, which refuses `.ts` inside `node_modules`: so `config.js` is plain JS with JSDoc types, and `dist/config.d.ts` is built.
- **Colours are roles, never values.** `theme.css` holds no colour: only `var(--role)` and `color-mix` of roles. That keeps the tokens'
  7:1 for text and labels, the colour mode (VitePress's `.dark` class, which the tokens honour) and the seasons. Do not add a hex value
  (stylelint refuses it) or a role that is not in the token contrast check.
- **Tint rules, as in `@meddleware/ui`.** Text in a tone colour over a tint of that tone loses contrast. Blocks and badges keep
  body-colour text and show the tone as the border; every `-soft` background is `--lift`, on which each text role is verified. Only diff
  and warning lines in code blocks are tinted. The `.dark` selector of VitePress has the same specificity as `:root`, so `theme.css`
  declares on `:root, .dark` and is imported after VitePress's CSS.
- **No purple.** VitePress's "important" tone is the accent here.
- **Code is AAA too.** The syntax themes are the GitHub high-contrast pair with comments recoloured to the tokens' `muted` (the themes
  treat comments as exempt at 5:1). Syntax colours are checked against `--surface`.
- **The landmark edits are exact and loud.** `landmarks.js` rewrites two default-theme components as they compile. Every edit throws,
  naming the file, unless its text occurs exactly once; `tests/landmarks.test.ts` runs them against the installed VitePress, so an upgrade
  fails here first. VitePress is pinned exactly (`2.0.0-alpha.21`) for this reason; re-check the edits on every bump, and drop an edit
  when upstream fixes it.
- **The reset is imported.** `@meddleware/ui/reset.css` is needed for the panel classes of `AppFooter`. It is layered
  (`@layer mw.reset`) and VitePress's CSS is not, so VitePress wins wherever it styles.

## The site scripts

`src/bin/` holds four plain-JS bins (`mw-gen-llms-full`, `mw-check-dist-no-audit`, `mw-gen-onchain`, `mw-check-onchain-ids`) that docs-site
and dev-site share; `src/site-config.js` reads and validates the `"meddleware"` section of the consuming site's `package.json`, and
`src/entry-point.js` is the self-run guard. They run from the **consumer's** cwd (`process.cwd()` is the site root), never from this
package's directory, and fail closed: a missing or malformed config exits 1. An installed bin runs through a symlink in `node_modules/.bin`,
so the guard compares `realpathSync(process.argv[1])`; `tests/site-bins.test.ts` runs every bin through such a symlink. The inline-script CSP
check is `mw-check-csp-inline` in `@meddleware/frontend-config`; do not duplicate it here. Bins must be `// @ts-check`ed, start with
`#!/usr/bin/env node`, be mode 755 and listed (without a leading `./`) in `bin`.

## The fixture

`docs/` is a VitePress site that exercises every element the theme styles (home hero, prose, links in code, tables, code, blocks,
badges). `npm run test:e2e` builds it and runs axe at WCAG 2.2 AA and AAA (gating) in every theme × season on the home page and a guide
page, plus a landmark smoke test. Add an element there when the theme gains styling for it.

## Release

Version, CHANGELOG and lockfile are bumped by the release tooling. Push, tag `v<version>`; `npm-publish.yml` publishes with npm trusted
publishing after `node-ci.yml` (lint, tests, build, the five-browser gate, package contents) and the `node24-compat` job pass. Consumers
pin `^0.0.x`, an exact pin on 0.0.x, so bump them together.
