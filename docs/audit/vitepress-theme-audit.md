# Security Audit — `vitepress-theme`

**Classification:** Internal security review (first-pass baseline; awaiting external review)
**Project:** repos/vitepress-theme (`@meddleware/vitepress-theme`) — the VitePress theme and shared site config for docs-site and dev-site: the default theme mapped onto the design tokens (colour mode, seasons, AAA contrast), a layout with the Meddleware footer, `baseConfig`, and exact-match landmark fixes applied to two default-theme components.
**Project type:** VitePress theme (Vue layout component + CSS + a Node-loaded config and a Vite plugin) — published as source plus one built `.d.ts`
**Template:** AUDIT_TEMPLATE.md (2026-11-01) + AUDIT_TEMPLATE_TS.md (2026-11-01) + AUDIT_TEMPLATE_VUE.md (2026-11-01, library rows; the hosting-header rows belong to the consuming sites) + AUDIT_TEMPLATE_SITE.md (2026-09-30, config rows: drafts exclusion, inline scripts) + AUDIT_TEMPLATE_A11Y.md (2026-11-01). Not triggered: `AUDIT_TEMPLATE_SUI_CLIENT.md` (no chain code; the footer links nowhere on-chain), `AUDIT_TEMPLATE_IMG.md` (no image — the sites that use it build one), `AUDIT_TEMPLATE_WALRUS.md`.
**Deployment status:** *(Current, 2026-11-05: `0.0.2` is released to npm with provenance (CI green, trusted publishing); consumers take it through their own 2026-11-05 releases. The text below is the earlier history, kept as written.)* npm `@meddleware/vitepress-theme` 0.0.1 (released 2026-10-31, tag `v0.0.1`, publish green, provenance on the registry — checked 2026-11-01); 0.0.2 released 2026-11-05 (F1, F2, VitePress alpha.21). Placeholder versions `0.0.0-rename.0` / `0.0.0-stage` exist (F6). Consumers (`^0.0.1`, exact on 0.0.x): docs-site, dev-site. Not an image, not deployed itself; its output is part of the docs. and dev. images.
**Review date:** 2026-11-01
**Reviewer:** Internal review
**Severity ceiling:** Low — build-time code in two sites' builds and static presentation in the browser; it handles no user data, makes no request and holds no key. The realistic harms are a theme regression that makes the documentation sites harder to use, or a compromised release running in two site builds.
**Status:** first-pass baseline 2026-11-01 (0.0.2 released 2026-11-05). 8 findings (2 Positive): 2 RESOLVED in source, 1 MITIGATED, 2 ADJUDICATED, 1 DEFERRED (maintainer-only).

---

## Executive summary

The theme replaces two byte-identical copies in docs-site and dev-site. Its job is presentational: every colour is a design-token role (`theme.css` contains no literal colour — checked by grep and by stylelint `color-no-hex` / `declaration-strict-value`), the layout adds the footer, and `baseConfig` fixes the language, URLs, appearance, the browser-chrome colour, the high-contrast syntax themes (comments recoloured to the tokens' `muted` so code keeps AAA) and the build settings VitePress needs to render the design-system components.

Two parts need care and both are handled with loud failure rather than silence: the **landmark patches** rewrite two default-theme components while Vite compiles them (each edit throws naming the file unless its text occurs exactly once, and a test runs them against the installed VitePress), and the **exact VitePress pin** (an alpha) that makes the first one safe. VitePress 2.0.0-alpha.21 was tried on this pass — landmark tests, build and the full sweep pass unchanged — and is adopted in 0.0.2.

The review found the fixture's accessibility gate narrower than the apps' (axe only; no reflow, text-size, forced-colours, reduced-motion or keyboard checks), `SECURITY.md` missing from the tarball, and — once the shared keyboard walk was made reliable — the footer lying under VitePress's fixed sidebar on every page that has one (F9); all are fixed in 0.0.2. The theme itself passes the full shared sweep in the five CI browser projects with the CI font (105 tests per run before the change; 34 per browser project after it).

## Threat model / trust boundaries

| Actor / source | What it controls | Bounded by |
| --- | --- | --- |
| npm registry / publish authority | the theme and the Vite plugin that run in docs-site and dev-site builds | trusted publishing + provenance; tag-gated CI; consumers' lockfiles |
| VitePress (default theme components, exact pinned alpha) | the text the landmark edits match, the inline bootstrap scripts the sites' CSP hashes cover | exact pin; edits throw on a changed text; tests run them against the installed version |
| Consuming site authors | `baseConfig` options (`title`, `nav`, `sidebar`, `appearance`, `head`, `extra`), the page content | the site's own audit (SITE lens) |
| Design tokens and `@meddleware/ui` (peers) | colours, seasons, footer, reset | peer ranges; the token contrast gate (7:1); the ui audit |
| Readers | nothing beyond their browser | static output; hosting headers belong to the site images (VUE B.VUE-1) |

**Primary trust anchor:** the trusted publisher; secondarily the exact VitePress pin.

### Supply chain & input matrix (TS lens)

| Input | Producer | Validation | Failure mode |
| --- | --- | --- | --- |
| VitePress component source | `node_modules/vitepress/dist/client/theme-default` | `replaceOnce`: exactly one occurrence or throw | build fails naming the file |
| `baseConfig` options | the site's `config.ts` | typed (JSDoc); `srcExclude: ['audit/**']` is always set | type error at the site |
| `tokens.json` | `@meddleware/design-tokens` | JSON import with attributes; `semantic.light.bg` / `dark.bg` read | build fails if the shape changes |

## Severity scale

Critical / High / Medium / Low / Info / Positive — unchanged across the corpus.

## Scope

In scope: `src/` (`config.js`, `landmarks.js`, `index.ts`, `MeddlewareLayout.vue`, `theme.css`, `env.d.ts`), `docs/` (the fixture site), `e2e/`, `tests/`, `package.json` (peers, `files`, `exports`), `.github/`, `SECURITY.md`, `CLAUDE.md`, the tarball, the registry record.

Out of scope: the content and CSP of the sites that use it (docs-site, dev-site audits); VitePress; the token values (design-tokens audit).

Environment and commands (2026-11-01): `npm ci`; `npm ls --all`; audit gate (0); `vue-tsc --noEmit`; `npm run lint` (stylelint, eslint, html-validate); `vitest` (2 files, 12 tests); `npm run build`; `npm run test:e2e` with `E2E_BROWSERS=all` and a fontconfig mapping `sans-serif`/`system-ui` to DejaVu Sans (105 passed, 2.5 min, on alpha.20); the shared sweep on the fixture on alpha.21 in all five projects (170 passed, 3.4 min); `npm pack --dry-run --json`.

## Findings

### F1 — The fixture's accessibility gate was narrower than every app's
**Severity:** Low   **Disposition:** RESOLVED
**Where:** `e2e/a11y.spec.ts`.
**Issue:** the fixture ran axe at AA and AAA in every colour mode × season on two pages, but none of the other sweeps every app runs: reflow at 320 px, 200% text, forced colours, reduced motion, and the keyboard pass (focus visible; as of frontend-config 0.0.2, not hidden behind the fixed navigation bar). The theme is the shell of two sites and owns the navbar, sidebar and footer styling, so those regressions would have appeared first in the sites rather than here.
**Impact:** a theme change that breaks reflow or the focus ring would pass this repo's CI and fail (or pass unnoticed) downstream.
**Remediation / evidence:** the fixture now uses the shared `defineA11ySuite` for both pages with `aaa: 'gate'`; the landmarks test stays. 34 tests per browser project; all pass on Chromium with the CI font (alpha.21), including the keyboard pass against VitePress's fixed navbar. 0.0.2.

### F2 — `SECURITY.md` not in the published files
**Severity:** Low   **Disposition:** RESOLVED
**Where:** `package.json` `files`; CI contents regex.
**Remediation / evidence:** added to `files` and to the contents check. 0.0.2.

### F3 — The landmark patches depend on VitePress internals and an exact alpha pin
**Severity:** Medium   **Disposition:** MITIGATED
**Where:** `src/landmarks.js` (`EDITS` for `VPContent.vue`, `VPDocFooter.vue`); `package.json` peer and dev `vitepress`.
**Issue:** the theme rewrites two components of VitePress's default theme as they compile (a `<main>` for the home, `page` and 404 layouts; the doc footer's `<footer>` becomes a `<div>` so there is one `contentinfo`). A VitePress release that changes the text would break the build, or — worse — silently lose a fix.
**Impact:** the sites fail WCAG landmark rules (a missing `<main>`, two `contentinfo`) if an edit were skipped; a build failure is the loud alternative and is what happens.
**Remediation / evidence:** every edit throws naming the file unless its text occurs exactly once (`replaceOnce`); `tests/landmarks.test.ts` runs both edits against the installed VitePress; VitePress is pinned exactly (peer `2.0.0-alpha.21`, a deliberate bump per release) and Dependabot's bump PR is merged only after the landmark tests, the build and the sweep pass (done for alpha.20 → alpha.21 on this pass). The pin is to a pre-release: the cost of an alpha is accepted by the maintainers' choice of VitePress 2; moving to a stable 2.x removes the exact pin (CHANGELOG note then). Drop an edit when upstream fixes it.

### F4 — Inline bootstrap scripts are the sites' to cover
**Severity:** Low   **Disposition:** ADJUDICATED
**Where:** `src/config.js` (`appearance`), VitePress output; docs-site and dev-site Dockerfiles (CSP `script-src 'self' 'sha256-…'`, `check-csp-inline.mjs`).
**Issue:** VitePress emits two inline scripts per page (the colour-mode bootstrap whose text depends on the `appearance` option, and the hash-map bootstrap). The theme does not add an inline script of its own; the CSP hashes live in the sites' images.
**Impact:** changing `appearance` or upgrading VitePress changes an inline script's text and so its hash; the site build fails at its `check-csp-inline` step rather than shipping a page the browser blocks.
**Remediation / evidence:** adjudicated — the control (build-time check) is in the consumers and is reviewed in their audits; this audit records that the theme adds none (the footer and CSS are external files).

### F5 — Positive: the theme is token-only, and passes AAA in every theme × season on five browsers
**Severity:** Positive
**Evidence:** no hex, `rgb()` or `hsl()` in `theme.css` (grep, stylelint); tones follow the ui tint rules (tone as border, body-colour text on `--lift`); the syntax themes are the GitHub high-contrast pair with comments recoloured to `muted`; 105 tests passed on Chromium, Firefox, WebKit and the two mobile projects with the DejaVu fallback font, then 34 tests per project on all five (alpha.21, after F9).

### F6 — Placeholder npm versions
**Severity:** Info   **Disposition:** DEFERRED
**Where:** npm — `0.0.0-rename.0`, `0.0.0-stage`.
**Remediation / evidence:** deprecate them (credentialed npm action): `OPERATOR_TASKS.md`, npm housekeeping item 3, with the exact command and the list of all eighteen packages. Cosmetic; not a mainnet gate.

### F7 — Positive: SSR-safe season handling and a stable footer link base
**Severity:** Positive
**Evidence:** `enhanceApp` calls `useSeason()` only in the browser (static rendering builds); `CopyrightLine` resolves its legal links against the canonical `https://meddleware.co.uk/legal/` host through the ui URL helpers, so the sites ship no legal copies (D103).

### F8 — `shiki` is a direct dependency alongside VitePress's own copy
**Severity:** Info   **Disposition:** ADJUDICATED
**Where:** `package.json` `dependencies` (`shiki` ^4.4.3).
**Issue:** `config.js` imports the two high-contrast theme objects from `shiki/themes/*.mjs`; VitePress bundles its own shiki.
**Impact:** none observed — only theme data objects are imported, not the highlighter; a second shiki in `node_modules` costs install size.
**Remediation / evidence:** adjudicated; revisit if VitePress re-exports its theme list.

### F9 — The footer lay under the fixed sidebar (WCAG 2.4.11 focus not obscured)
**Severity:** Medium   **Disposition:** RESOLVED
**Where:** `src/MeddlewareLayout.vue` (`#layout-bottom`), `src/theme.css`.
**Issue:** VitePress hides its own footer on a page with a sidebar, because the sidebar is fixed and as tall as the viewport from 60rem. The Meddleware footer carries the legal links and stays on every page, but was rendered full width, so on a page with a sidebar its first links lay under the sidebar. Keyboard users tabbing to them lost sight of focus; docs-site's own sweep found it (three tests: the © link "hidden behind aside.VPSidebar"). The fixture's own sweep had not: its keyboard walk ended early on a repeated link label (see frontend-config F2).
**Impact:** the legal notice link unreachable by sight for keyboard and screen-magnifier users on every documentation page.
**Remediation / evidence:** the layout reads `useLayout().hasSidebar` and wraps the footer in `.mw-layout-footer.has-sidebar`; `theme.css` starts it where the content starts (same offsets as VitePress's own content, at the same breakpoints). Tests: three width tests (1024, 1280, 1920 px) that scroll the footer link into view and assert `elementFromPoint` is the link; the keyboard pass of the sweep now passes on the fixture in all five projects (170 passed with the CI font). 0.0.2.

---

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | The theme holds no colour of its own: roles and mixes of roles only | `theme.css`; stylelint `color-no-hex`, `declaration-strict-value` | `npm run lint:css`; fixture sweep | HOLDS |
| I2 | Text and labels keep 7:1 in every theme × season on every page of the fixture | token contrast gate (design-tokens); fixture sweep | `e2e/a11y.spec.ts` (AAA `gate`) on five browsers | HOLDS |
| I3 | Every page has one `main` and one `contentinfo` | `landmarks.js` edits; layout footer | `tests/landmarks.test.ts`; e2e landmarks test; axe `landmark-*` | HOLDS |
| I4 | A VitePress change that invalidates a patch fails the build, naming the file | `replaceOnce` | `tests/landmarks.test.ts` (12 tests total with config) | HOLDS (F3) |
| I5 | The sweep (reflow, 200% text, forced colours, reduced motion, keyboard incl. focus not obscured) passes on the fixture, and the footer is never under the sidebar | `e2e/a11y.spec.ts` | 34 tests per browser project | HOLDS (F1, F9) |
| I6 | The theme adds no inline script and no network request | `src/` | code review; e2e `pageerror` check; offline routes | HOLDS |
| I7 | Audit documents are not site content | `baseConfig` `srcExclude: ['audit/**']` | `tests/config.test.ts` | HOLDS |
| I8 | Season handling is browser-only | `index.ts::enhanceApp` | static build succeeds; e2e | HOLDS (code-only) |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `vitepress` | exact `2.0.0-alpha.21` (peer and dev) | build time | clean at review | alpha; see F3 |
| `vue` ^3.5, `@meddleware/ui` ^0.1.36, `@meddleware/design-tokens` ^0.1.12 | peers | build and browser | audited separately | exact on 0.x |
| `shiki` ^4.4.3 | runtime dependency | build time | clean | theme data only (F8) |
| `@meddleware/frontend-config` ^0.0.1 | dev | CI | see its audit | lint, sweep |
| Playwright ~1.64.1, stylelint, eslint, html-validate | dev | CI | clean | |

Audit gate: 0 high/critical, allowlist empty.

### B.2 Publish authority & CI

| Authority | Held by | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub OIDC trusted publisher for `meddleware-org/vitepress-theme` | no token | tag `v*`; `verify` = `node-ci.yml` (actionlint, audit, type-check, lint, tests, build, five-browser e2e, contents, Node 24 floor) | revoke on suspicion |

#### CI & release integrity

- **Actions pinned** — HOLDS. **Least privilege** — HOLDS (`id-token: write` only on `publish-npm`). **OIDC/provenance** — HOLDS. **Tag-gated, idempotent publish** — HOLDS. **Release gate equals CI** — HOLDS. **Automated dependency updates** — HOLDS (`dependabot.yml`; the first PR, VitePress alpha.21, was reviewed and adopted on this pass). **Secrets / real funds / test-only modes** — N/A.

### B.TS-1 Packaging

`files`: `src`, `dist`, `CHANGELOG.md`, `SECURITY.md` (F2). `npm pack --dry-run`: 12 files, 8 KiB — sources, `dist/config.d.ts`, `dist/landmarks.d.ts`, no `docs/`, `e2e/`, tests or config. CI asserts the whitelist. `exports`: `.` (TS source — compiled by the site's Vite, `ssr.noExternal` for `@meddleware/*`), `./config` (plain JS + built types — Node cannot load TS from `node_modules`), `./theme.css`. `sideEffects` lists CSS and Vue files.

### B.TS-2 Install-time code

None (`prepublishOnly` builds the types). One Vite plugin (`landmarks`) runs in the consumer's build, which is why the supply-chain note in SECURITY.md exists.

### B.TS-3 Supply-chain gates

Lockfile, `npm ci`, audit gate in CI and publish; consumers pin exactly.

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B+ (12 unit tests, 2 files; 34 browser tests per project, 5 projects; 2026-11-01)

| Dimension | Assessment |
| --- | --- |
| Happy path | `baseConfig` output, landmark edits against the real VitePress, rendered fixture |
| Error / failure paths | a changed VitePress text throws (the `replaceOnce` negative cases) |
| Boundary | `appearance` variants → chrome colour entries, merging of `extra`, `vite.ssr.noExternal` |
| Security-relevant | `srcExclude` for audits; no inline script of ours |

The `baseConfig` merge rules (`extra.themeConfig`, `extra.vite`, `extra.markdown`) are tested for the common shapes only; an unusual `extra` is the site's responsibility.

### C.2 Hermetic vs. live paths

Hermetic: all of it (fixture site; routes refuse non-local requests). Live: the real docs. and dev. sites are covered by their own e2e and by the deployment check.

## Section D — Deployment-readiness gates

### pre-localnet
- [x] builds; tests and lint green; no secrets

### pre-testnet
- [x] published with provenance; in use by two live sites
- [x] CI gates green (five browsers)
- [x] `SECURITY.md` present; published as of 0.0.2 (F2)
- [ ] 0.0.2 released and adopted by docs-site and dev-site — in this wave
- [ ] placeholder versions deprecated (F6) — maintainer

### pre-mainnet
- [ ] external review; move to a stable VitePress 2.x when released
- [ ] renumber to 0.2.0 at go-live

## Cross-project themes

- **Supply chain & release integrity** — B.2; exact VitePress pin (F3).
- **Wire-format coupling** — the token contract (`tokens.json` shape, CSS role names such as `--bg`, `--lift`, `--surface`, `--accent`, `--secondary`, `--ok`, `--text`, `--muted`, `--border`) shared with design-tokens and ui: a renamed role leaves a variable undefined, caught by the sweep (contrast) and by the stylelint role list.
- **On-chain-truth boundary** — N/A.
- **Deployment readiness** — Section D.
- **Chain-access layering** — N/A.
- **Versioning policy** — patch-only until mainnet.

## Normative requirements (MUST / MUST NOT)

- **VT-M1** MUST NOT contain a literal colour; every colour is a token role (I1).
- **VT-M2** MUST keep every landmark edit exact and loud, and test it against the installed VitePress (I4).
- **VT-M3** MUST pin VitePress exactly while any edit depends on its internals, and adopt a bump only with the landmark tests, the build and the sweep green (F3).
- **VT-M4** MUST NOT add an inline script or a network request (I6).
- **VT-M5** MUST pass the full shared accessibility sweep on its fixture (I5).
- **VT-M6** MUST exclude `audit/**` from site content (I7).

## Implementation suggestions (SHOULD / MAY)

- **S1** SHOULD add a fixture page with a long sidebar and a table of contents so the keyboard pass covers them.
- **S2** MAY test `baseConfig` merge rules against more `extra` shapes.

## Open questions (`OQ#`)

- **OQ1** — Move the sites to a stable VitePress 2.x as soon as one exists (lifting the exact pin), or stay on the alpha line and bump per release? Currently: stay, bump per release (F3).

## Risks

- A VitePress alpha can change internals between releases; the edits fail the build rather than the site, but each bump costs a review.
- A compromised release runs in two sites' builds (low blast radius: static output).
- The fixture cannot cover pages the sites generate (typedoc API pages): the sites' own sweeps cover those.

## Re-verification log

- 2026-11-01 — first-pass baseline. Read every source file and the fixture; ran `npm ci`, `npm ls --all`, the audit gate, type-check, lint, unit tests (12), build, `npm pack --dry-run`; ran the five-browser e2e with the CI font (105 passed); installed VitePress alpha.21 and re-ran landmark tests, build and the shared sweep (all pass), merged the Dependabot PR; converted the fixture gate to the shared sweep (F1) and published `SECURITY.md` (F2). F6 handed to `OPERATOR_TASKS.md`.
