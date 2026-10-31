// The theme's accessibility gate: every page of the fixture in every colour mode × season, at WCAG 2.2 AA and AAA (7:1 text and labels).
import { expect, test } from '@playwright/test'
import { expectAccessible } from '@meddleware/frontend-config/axe'
import { applyLook, looks, offline } from '@meddleware/frontend-config/look'

const PAGES = [
  ['home', '/'],
  ['guide', '/guide'],
] as const

for (const { viewport, theme, season } of looks().filter((l) => l.viewport === 'desktop')) {
  for (const [name, path] of PAGES) {
    test(`${name} has no axe violations, AA or AAA (${theme} · ${season})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme as 'light' | 'dark', reducedMotion: 'reduce' })
      await offline(page)
      await page.goto(path)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      await applyLook(page, theme, season)
      expect(viewport).toBe('desktop')
      await expectAccessible(page, { aaa: 'gate' })
    })
  }
}

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
