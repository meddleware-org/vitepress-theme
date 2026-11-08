import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = (f: string) => readFileSync(join(import.meta.dirname, '..', 'src', f), 'utf8')

// VitePress's default theme ships sixteen Inter font files and preloads one; this theme sets its own system font stack and uses none of them.
describe('no web fonts', () => {
  it('imports the default theme without its fonts, everywhere', () => {
    for (const f of ['index.ts', 'MeddlewareLayout.vue']) {
      expect(src(f), f).toContain("vitepress/theme-without-fonts")
      expect(src(f), f).not.toMatch(/from 'vitepress\/theme'/)
    }
  })
  it('names no font host or font file in its styles', () => {
    expect(src('theme.css')).not.toMatch(/fonts\.(googleapis|gstatic)|\.woff2?|@font-face/)
  })
})
