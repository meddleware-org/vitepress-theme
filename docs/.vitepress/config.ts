import { baseConfig } from '../../src/config.js'

// A fixture site for the theme: every element the default theme styles (home hero, prose, code, tables, custom blocks, badges), so the
// accessibility and screenshot runs cover the whole theme. It is not published (`files` ships `src` only).
export default baseConfig({
  configUrl: import.meta.url,
  title: 'Theme fixture',
  description: 'A fixture for @meddleware/vitepress-theme.',
  nav: [
    { text: 'Guide', link: '/guide' },
    { text: 'Reference', items: [{ text: 'Elements', link: '/guide#elements' }] },
  ],
  sidebar: { '/': [{ text: 'Fixture', items: [{ text: 'Guide', link: '/guide' }] }] },
})
