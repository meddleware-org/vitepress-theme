# @meddleware/vitepress-theme

The Meddleware [VitePress](https://vitepress.dev) theme and site config. It is the default theme with every colour, surface and font
taken from [`@meddleware/design-tokens`](https://github.com/meddleware-org/design-tokens), so a site follows the colour mode and the
seasons and keeps the tokens' WCAG AAA contrast (7:1 for text and labels), plus a footer and the config the sites share.

## Use

```ts
// docs/.vitepress/theme/index.ts
export { default } from '@meddleware/vitepress-theme'
```

```ts
// docs/.vitepress/config.ts
import { baseConfig } from '@meddleware/vitepress-theme/config'

export default baseConfig({
  configUrl: import.meta.url, // docs/ is the source directory, ../dist the output
  title: 'Meddleware Docs',
  description: '…',
  nav: [{ text: 'Guide', link: '/guide' }],
  sidebar: { '/': [{ text: 'Guide', items: [{ text: 'Overview', link: '/' }] }] },
  // appearance: 'dark' (default) | true | false, head: [...], extra: { ...anything else VitePress takes }
})
```

A site that needs more extends the theme: `{ extends: MeddlewareTheme, enhanceApp() {…} }`.

`baseConfig` sets the language (`en-GB`), clean URLs, the favicon, the browser-chrome colour (from the tokens), local search, the GitHub
link, the high-contrast syntax themes (with comments as readable as the rest) and `ssr.noExternal` for `@meddleware/*`, which ship Vue
components that import their own CSS. `themeConfig`, `vite` and `markdown` in `extra` are merged one level down.

## What the theme does

| | |
| --- | --- |
| `theme.css` | maps every `--vp-*` colour onto a token role; tone blocks and badges keep body-colour text with the tone as the border; nothing is purple |
| `MeddlewareLayout.vue` | the default layout plus `AppFooter` and `CopyrightLine` (a `contentinfo` landmark) |
| `landmarks.js` | a Vite plugin that gives home, `page` and 404 pages a `<main>`, and turns the mid-page doc footer into a `div` (it was a second `contentinfo`); exact edits that fail the build if VitePress changes |
| `index.ts` | imports the tokens, the seasons and `@meddleware/ui/reset.css`, and sets the season from the calendar |

The reset is declared in a cascade layer, and VitePress's own CSS is unlayered, so it wins wherever it styles an element.

## Site scripts

The build-time scripts docs-site and dev-site used to copy are installed as bins. Run them from the site's root (the directory with
its `package.json`); they read that directory, never this package's.

| Bin | What it does |
| --- | --- |
| `mw-gen-llms-full <site-url> "<title>"` | writes `dist/llms-full.txt` (llmstxt.org): every published page's Markdown in one file; audit, `public/`, `.vitepress/` and generated `api`/`wire-api` pages are left out. Run after `vitepress build` |
| `mw-check-dist-no-audit [distDir]` | exits 1 when the built site (`dist` by default) contains an audit page. `findAuditPages` is exported as `@meddleware/vitepress-theme/check-dist-no-audit` |
| `mw-gen-onchain` | imports the canonical on-chain docs of the Move packages (`access-gate-sui`, `sealed-storage-sui`, `token-issuance-template-sui`) into `docs/<outBase>` and writes `docs/.vitepress/generated/onchain-sidebar.json`. Reads the installed packages, or `ONCHAIN_DOCS_ROOT=<dir>` (sibling checkouts). A missing package writes a placeholder and still exits 0; a missing or malformed configuration exits 1 |
| `mw-check-onchain-ids` | exits 1 when a hand-written page carries a 32-byte `0x…` id that is not a current testnet id of `@meddleware/access-gate-client` / `@meddleware/sealed-storage-client` (or an allow-listed one), or a reference page lacks a required id. Fails closed: unreadable clients or configuration fail the check. Needs `typescript` (the site has it; else this package's) |

`mw-check-csp-inline` (the inline-script CSP check) is in `@meddleware/frontend-config`, not here.

`mw-gen-onchain` and `mw-check-onchain-ids` are configured by a `"meddleware"` section in the site's `package.json`:

```jsonc
{
  "scripts": {
    "gen:onchain": "mw-gen-onchain",
    "check:onchain-ids": "mw-check-onchain-ids",
    "build": "npm run gen:onchain && npm run check:onchain-ids && vitepress build docs && mw-gen-llms-full https://docs.meddleware.co.uk \"Meddleware documentation\" && mw-check-dist-no-audit"
  },
  "devDependencies": { "@meddleware/vitepress-theme": "^0.0.3" },
  "meddleware": {
    "site": {
      "id": "docs", // this site's id in the manifests' `sites` lists
      "outBase": "blockchain/sui/onchain", // under docs/; also the tree mw-check-onchain-ids does not scan
      "otherSite": { "id": "dev", "origin": "https://meddleware.dev", "base": "sui/onchain" } // where pages this site leaves out are linked
    },
    "onchainIds": {
      "required": { "blockchain/sui/access-gate/reference.md": ["accessGate.originalId", "accessGate.platformConfigId"] }, // page under docs/ -> ids it must show
      "otherIds": [{ "id": "0x…64 lower-case hex digits", "reason": "why this is not a deployment" }], // optional
      "skipDirs": ["api", "wire-api"] // optional: directory names skipped at any depth, besides node_modules, .vitepress and audit
    }
  }
}
```

`required` names ids by their dotted path in the clients' testnet deployments (`accessGate.originalId`, `sealPolicies.policyConfigId`, …) and
must name at least one page. Paths (`outBase`, `base`) are relative, without a leading or trailing slash.

## Peers

`vitepress` (exact: 2.x alpha), `vue`, `@meddleware/ui`, `@meddleware/design-tokens`; optionally `typescript` (for `mw-check-onchain-ids`).

## Development

`npm run build:site` builds the fixture site in `docs/`; `npm run test:e2e` runs axe (WCAG 2.2 AA and AAA) over it in every colour mode ×
season (`E2E_BROWSERS=all` for five browsers); `npm run shots` captures the screenshot matrix.

## Licence

0BSD.
