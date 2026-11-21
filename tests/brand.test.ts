/**
 * Tests for the favicon set (`src/brand.js`): the files and a manifest are copied into the built site, the `<link>` tags are in every page's head,
 * and the dev server serves the set. A fake `@meddleware/ui` (five placeholder brand files) is installed in a temp directory, and the process
 * moves into it, because the set is resolved from the working directory.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BRAND_FILES, brandDev, brandHead, copyBrand, manifest } from '../src/brand.js'
import { baseConfig } from '../src/config.js'

/** The temp directory standing in for a site. */
let root: string
const cwd = process.cwd()
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tb-'))
  const ui = join(root, 'node_modules/@meddleware/ui')
  mkdirSync(join(ui, 'dist/brand'), { recursive: true })
  writeFileSync(join(ui, 'package.json'), JSON.stringify({ name: '@meddleware/ui', version: '1.0.0', exports: { './brand/*': './dist/brand/*' } }))
  for (const f of Object.keys(BRAND_FILES)) writeFileSync(join(ui, 'dist/brand', f), `file:${f}`)
  process.chdir(root)
})
afterEach(() => {
  process.chdir(cwd)
  rmSync(root, { recursive: true, force: true })
})

// What a site gets without keeping an icon of its own: the files in the build, the tags in the head, and the dev server.
describe('the brand icons of a site', () => {
  it('copies the set and a manifest into the built site', () => {
    const out = join(root, 'dist')
    copyBrand(out, 'Meddleware Docs')
    for (const f of Object.keys(BRAND_FILES)) expect(readFileSync(join(out, f), 'utf8')).toBe(`file:${f}`)
    expect(JSON.parse(readFileSync(join(out, 'site.webmanifest'), 'utf8'))).toMatchObject({ name: 'Meddleware Docs', display: 'browser' })
    expect(existsSync(join(out, 'favicon.svg'))).toBe(true)
  })

  it('links the set from every page and wires the build end and the dev server in baseConfig', () => {
    const c = baseConfig({ configUrl: import.meta.url, title: 'T', description: 'D' })
    for (const entry of brandHead) expect(c.head).toContainEqual(entry)
    expect(typeof c.buildEnd).toBe('function')
    expect((c.vite?.plugins as { name?: string }[]).some((p) => p.name === 'meddleware:brand-icons')).toBe(true)
  })

  it('serves the set in development and leaves other requests alone', () => {
    const use = vi.fn()
    ;(brandDev('T') as unknown as { configureServer: (s: unknown) => void }).configureServer({ middlewares: { use } })
    const fn = use.mock.calls[0]![0] as (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: unknown) => void }, next: () => void) => void
    const res = { setHeader: vi.fn(), end: vi.fn() }
    fn({ url: '/favicon.ico' }, res, vi.fn())
    expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/x-icon')
    const next = vi.fn()
    fn({ url: '/guide' }, res, next)
    expect(next).toHaveBeenCalled()
    expect(JSON.parse(manifest('T')).short_name).toBe('T')
  })
})
