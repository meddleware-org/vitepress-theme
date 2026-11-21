// The Meddleware VitePress theme: the default theme + the design tokens (colour mode, seasons, AAA contrast) + a footer.
//
//   // docs/.vitepress/theme/index.ts
//   export { default } from '@meddleware/vitepress-theme'
//
// A site that needs more extends it: `{ extends: MeddlewareTheme, enhanceApp() {…} }`.
// What it adds to the default theme: the layout with the Meddleware footer (MeddlewareLayout.vue), the tokens and the reset as imported CSS, and
// theme.css, which maps every VitePress colour onto a token role. The colour mode lives in VitePress's own switch (the site config keeps its
// choice out of storage: `unstoredAppearance`), and the season follows the calendar.
// `theme-without-fonts`: the default theme minus its Inter font files (sixteen preloaded .woff2 files nothing used: the site's font is the
// system stack of the tokens). No web font is shipped or requested.
import DefaultTheme from 'vitepress/theme-without-fonts'
import type { Theme } from 'vitepress'
import { useSeason } from '@meddleware/ui'
import MeddlewareLayout from './MeddlewareLayout.vue'
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import './theme.css'

/** The theme object VitePress loads: the default theme, our layout, and the one setup step the browser needs. */
const theme: Theme = {
  extends: DefaultTheme,
  // Replaces only the layout; every other part of the default theme is used as it is.
  Layout: MeddlewareLayout,
  enhanceApp() {
    // Browser only (a no-op while rendering the static pages): the season follows the calendar.
    useSeason()
    // Earlier versions let VitePress store the colour mode on every first visit; nothing reads that key now (see `unstoredAppearance`).
    // A visitor who has the old key keeps nothing of ours on their device after one visit: it is removed here (nothing stored before an action, D134).
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('vitepress-theme-appearance')
      } catch {
        // storage blocked: nothing was stored either
      }
    }
  },
}

export default theme
