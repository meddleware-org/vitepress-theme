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

## Peers

`vitepress` (exact: 2.x alpha), `vue`, `@meddleware/ui`, `@meddleware/design-tokens`.

## Development

`npm run build:site` builds the fixture site in `docs/`; `npm run test:e2e` runs axe (WCAG 2.2 AA and AAA) over it in every colour mode ×
season (`E2E_BROWSERS=all` for five browsers); `npm run shots` captures the screenshot matrix.

## Licence

0BSD.
