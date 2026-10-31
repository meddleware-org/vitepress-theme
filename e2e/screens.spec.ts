// Screenshots for LOOKING at the fixture (see @meddleware/frontend-config/shots). Run: npm run shots (after npm run build:site)
import type { Page } from '@playwright/test'
import { defineShots } from '@meddleware/frontend-config/shots'

const open = (path: string) => async (page: Page) => {
  await page.goto(path)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}
defineShots({ home: open('/'), guide: open('/guide') })
