// The Meddleware VitePress theme: the default theme + the design tokens (colour mode, seasons, AAA contrast) + a footer.
//
//   // docs/.vitepress/theme/index.ts
//   export { default } from '@meddleware/vitepress-theme'
//
// A site that needs more extends it: `{ extends: MeddlewareTheme, enhanceApp() {…} }`.
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { useSeason } from '@meddleware/ui'
import MeddlewareLayout from './MeddlewareLayout.vue'
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import './theme.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout: MeddlewareLayout,
  enhanceApp() {
    // Browser only (a no-op while rendering the static pages): the season follows the calendar.
    useSeason()
  },
}

export default theme
