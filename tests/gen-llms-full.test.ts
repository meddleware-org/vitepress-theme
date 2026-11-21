/**
 * Tests for `generateLlmsFull` (`src/bin/gen-llms-full.js`): which pages go into llms-full.txt and in what order, that front matter is dropped and URLs
 * are clean, that the audit and generated pages are left out, and that it fails when `dist/` or `docs/` is missing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateLlmsFull } from '../src/bin/gen-llms-full.js'
import { TempSite } from './helpers/site'

/** A temp site with a built `dist/` and a docs tree that has every kind of page the generator treats differently. */
let site: TempSite
beforeEach(() => {
  site = new TempSite()
  mkdirSync(join(site.root, 'dist'))
  site.write('docs/index.md', '---\ntitle: Home\n---\n# Home\n')
  site.write('docs/zeta.md', 'Zeta\n')
  site.write('docs/guide/index.md', '# Guide\n')
  site.write('docs/guide/alpha.md', '---\na: 1\n---\n\n# Alpha\n\n')
  // Everything below is marked SECRET: it must never appear in the output (the audit, VitePress's own files, assets, generated API pages, non-Markdown).
  site.write('docs/audit/internal.md', 'SECRET')
  site.write('docs/.vitepress/notes.md', 'SECRET')
  site.write('docs/public/readme.md', 'SECRET')
  site.write('docs/blockchain/sui/x/api/Foo.md', 'SECRET')
  site.write('docs/blockchain/sui/x/wire-api/Foo.md', 'SECRET')
  site.write('docs/notes.txt', 'SECRET')
})
afterEach(() => site.remove())

describe('generateLlmsFull', () => {
  it('writes the published pages, home first then in order, without front matter, with their URLs', () => {
    const { pages, file } = generateLlmsFull({ siteUrl: 'https://example.test/', title: 'T', root: site.root })
    expect(pages).toEqual(['index.md', 'guide/alpha.md', 'guide/index.md', 'zeta.md'])
    expect(readFileSync(file, 'utf8')).toBe(
      [
        '# T', '', '> The full text of https://example.test/, one section per page.', '',
        '---', '', 'Source: https://example.test/', '', '# Home', '',
        '---', '', 'Source: https://example.test/guide/alpha', '', '# Alpha', '',
        '---', '', 'Source: https://example.test/guide/', '', '# Guide', '',
        '---', '', 'Source: https://example.test/zeta', '', 'Zeta', '',
      ].join('\n'),
    )
  })

  it('leaves out the audit, VitePress, public and generated API pages', () => {
    const { file } = generateLlmsFull({ siteUrl: 'https://example.test', title: 'T', root: site.root })
    expect(readFileSync(file, 'utf8')).not.toContain('SECRET')
  })

  it('fails when dist/ is missing or docs/ is', () => {
    const bare = new TempSite()
    bare.write('docs/index.md', '# x')
    expect(() => generateLlmsFull({ siteUrl: 'https://e.test', title: 'T', root: bare.root })).toThrow('dist/ is missing')
    expect(() => generateLlmsFull({ siteUrl: 'https://e.test', title: 'T', root: join(bare.root, 'nowhere') })).toThrow()
    bare.remove()
  })
})
