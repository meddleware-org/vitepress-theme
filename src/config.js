// @ts-check
// The site config every Meddleware VitePress site shares: its language, URLs, appearance, colours in the browser chrome, local search,
// social link, the high-contrast syntax themes, and the build settings that let VitePress render the design-system components.
//
//   // docs/.vitepress/config.ts
//   import { baseConfig } from '@meddleware/vitepress-theme/config'
//   export default baseConfig({ configUrl: import.meta.url, title: 'Meddleware Docs', description: '…', nav, sidebar })
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import tokens from '@meddleware/design-tokens/tokens.json' with { type: 'json' }
import githubLight from 'shiki/themes/github-light-high-contrast.mjs'
import githubDark from 'shiki/themes/github-dark-high-contrast.mjs'
import { landmarks } from './landmarks.js'
import { brandDev, brandHead, copyBrand } from './brand.js'

/**
 * A syntax theme with its comments in `colour`. The high-contrast GitHub themes keep every token at 7:1 except comments (5:1, which
 * the theme treats as exempt); here a comment is text like any other.
 * @param {import('shiki').ThemeRegistration} theme
 * @param {string} colour
 * @returns {import('shiki').ThemeRegistration}
 */
function readableComments(theme, colour) {
  return {
    ...theme,
    name: `${theme.name}-readable-comments`,
    tokenColors: (theme.tokenColors ?? []).map((t) =>
      [t.scope ?? []].flat().includes('comment') ? { ...t, settings: { ...t.settings, foreground: colour } } : t,
    ),
  }
}

/**
 * @typedef {import('vitepress').UserConfig<import('vitepress').DefaultTheme.Config>} SiteConfig
 */

/**
 * @param {object} options
 * @param {string} options.configUrl `import.meta.url` of the site's `docs/.vitepress/config.ts`: the source directory is `docs/` and the
 *   output the repository's `dist/` (a Dockerfile copies `dist/` into the static server).
 * @param {string} options.title
 * @param {string} options.description
 * @param {import('vitepress').DefaultTheme.NavItem[]} [options.nav]
 * @param {import('vitepress').DefaultTheme.Sidebar} [options.sidebar]
 * @param {'dark' | true | false | 'force-dark' | 'force-auto'} [options.appearance] The colour mode a first visit gets (the toggle always
 *   works). Default `dark`, the estate's default.
 * @param {SiteConfig['head']} [options.head] Extra `<head>` entries (the favicon set, the web manifest link and the browser-chrome colour are always there).
 * @param {SiteConfig} [options.extra] Anything else, merged over the defaults (`themeConfig` and `vite` are merged one level down).
 * @returns {SiteConfig}
 */
export function baseConfig({ configUrl, title, description, nav = [], sidebar = {}, appearance = 'dark', head = [], extra = {} }) {
  const { themeConfig: extraTheme, vite: extraVite, markdown: extraMarkdown, ...rest } = extra
  const { light, dark } = tokens.semantic
  // The browser chrome follows the page: one colour when the site starts dark, a light and a dark one otherwise. Both are the page
  // background of the tokens, so they cannot drift from the theme.
  /** @type {import('vitepress').HeadConfig[]} */
  const chrome =
    appearance === 'dark' || appearance === 'force-dark'
      ? [['meta', { name: 'theme-color', content: dark.bg }]]
      : [
          ['meta', { name: 'theme-color', content: light.bg, media: '(prefers-color-scheme: light)' }],
          ['meta', { name: 'theme-color', content: dark.bg, media: '(prefers-color-scheme: dark)' }],
        ]

  return defineConfig({
    title,
    description,
    lang: 'en-GB',
    srcDir: fileURLToPath(new URL('..', configUrl)),
    outDir: fileURLToPath(new URL('../../dist', configUrl)),
    // The project's security audit lives in docs/audit (the audit corpus convention); it is not site content.
    srcExclude: ['audit/**'],
    cleanUrls: true,
    lastUpdated: false,
    appearance,
    head: [
      ...brandHead,
      ...chrome,
      ...head,
    ],
    // The favicon set of the company mark comes from @meddleware/ui; the site keeps no icon of its own.
    buildEnd: (siteConfig) => copyBrand(siteConfig.outDir, title),
    markdown: {
      // The high-contrast syntax themes with readable comments, so code keeps AAA contrast on the token surfaces in both colour modes.
      theme: { light: readableComments(githubLight, light.muted), dark: readableComments(githubDark, dark.muted) },
      ...extraMarkdown,
    },
    vite: {
      ...extraVite,
      // Landmark fixes for the default theme (see landmarks.js).
      plugins: [landmarks(), brandDev(title), ...(extraVite?.plugins ?? [])],
      ssr: {
        ...extraVite?.ssr,
        // The design-system packages ship Vue components and import their own CSS, which Node cannot load: Vite must process them
        // while rendering the static pages.
        noExternal: [/^@meddleware\//, ...(Array.isArray(extraVite?.ssr?.noExternal) ? extraVite.ssr.noExternal : [])],
      },
    },
    themeConfig: {
      search: { provider: 'local' },
      socialLinks: [{ icon: 'github', link: 'https://github.com/meddleware-org' }],
      nav,
      sidebar,
      ...extraTheme,
    },
    ...rest,
  })
}
