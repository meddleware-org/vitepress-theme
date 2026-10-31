import { vueApp } from '@meddleware/frontend-config/eslint'

// The fleet's Vue + TypeScript + accessibility + browser-compat config.
export default vueApp({ name: 'vitepress-theme', ignores: ['docs/.vitepress/cache/**', 'docs/.vitepress/dist/**'] })
