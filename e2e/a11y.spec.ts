// The theme's accessibility gate: every page of the fixture in every colour mode × season, at WCAG 2.2 AA and AAA (7:1 text and labels).
import { expect, test } from '@playwright/test'
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { offline } from '@meddleware/frontend-config/look'

// Every page of the fixture goes through the shared sweep: WCAG 2.2 AA and AAA (gating) in every colour mode × season, reflow at 320 px,
// 200% text, forced colours, reduced motion and the keyboard pass (focus visible and not hidden behind the fixed navigation bar).
const open = (path: string) => async (page: import('@playwright/test').Page) => {
  await page.goto(path)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}
defineA11ySuite({ home: open('/'), guide: open('/guide') }, { aaa: 'gate' })

test('mounts without an uncaught error and has its landmarks', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await offline(page)
  await page.goto('/guide')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  // The main navigation is in the bar on a wide screen and behind the menu button on a narrow one.
  const wide = (page.viewportSize()?.width ?? 0) >= 960
  await expect(wide ? page.getByRole('navigation', { name: 'Main' }) : page.getByRole('button', { name: /menu|navigation/i }).first()).toBeVisible()
  expect(errors).toEqual([])
})
