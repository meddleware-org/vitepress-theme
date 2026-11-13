import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// The built fixture site, served with `vitepress preview`; Chromium locally, all five browser projects in CI (E2E_BROWSERS=all to run
// them locally). The screenshot capture (`npm run shots`) is for looking, not asserting.
export default definePlaywrightConfig({ port: 4296, kind: 'vitepress' })
