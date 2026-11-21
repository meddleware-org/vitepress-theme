/**
 * Tests for the on-chain docs import (`src/bin/gen-onchain.js`): links are rewritten (kept relative when the page is on this site, sent to the other
 * site or to the repository otherwise), pages are copied under the configured base with a source footer, the sidebar is written, and a missing package
 * gives a placeholder and a warning rather than a failed build. The packages are fakes in a temp directory.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateOnchain, PACKAGES, rewriteLinks } from '../src/bin/gen-onchain.js'
import { cleanupSites, devSite, docsSite, TempSite } from './helpers/site'

/** A manifest like the Move packages publish: four pages, each for one or both sites (`gone.md` is listed but absent). */
const manifest = {
  package: '@meddleware/access-gate-sui',
  slug: 'access-gate',
  title: 'Access Gate',
  repository: 'https://github.com/example/access-gate-sui',
  pages: [
    { file: 'overview.md', title: 'Overview', sites: ['docs', 'dev'] },
    { file: 'user-guide.md', title: 'User guide', sites: ['docs'] },
    { file: 'dev-guide.md', title: 'Developer guide', sites: ['dev'] },
    { file: 'gone.md', title: 'Gone', sites: ['docs', 'dev'] },
  ],
}

/** The site being generated into, and the fake "workspace" holding the package's docs (the `ONCHAIN_DOCS_ROOT` override points at it). */
let site: TempSite
let source: TempSite
beforeEach(() => {
  source = new TempSite()
  source.writeJson('access-gate-sui/docs/onchain/manifest.json', manifest)
  source.write('access-gate-sui/docs/onchain/overview.md', 'See [guide](./user-guide.md#top), [dev](dev-guide.md), [sec](../../SECURITY.md#x), [web](https://x.test/a.md), [here](#h).\n')
  source.write('access-gate-sui/docs/onchain/user-guide.md', '# User\n')
  source.write('access-gate-sui/docs/onchain/dev-guide.md', '# Dev\n')
  // The generator logs and warns; the tests assert on files, so the noise is silenced (and restored in afterEach).
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  cleanupSites()
})
/** A temp site with a configuration. */
const make = (config: typeof docsSite | typeof devSite) => (site = new TempSite(config))
/** A generated file's text. */
const read = (rel: string) => readFileSync(join(site.root, rel), 'utf8')
/** Run the generator for a site, using the fake workspace as the docs root. */
const generate = (config: typeof docsSite | typeof devSite) => generateOnchain({ root: make(config).root, docsRootOverride: source.root })

describe('rewriteLinks', () => {
  it('keeps a page published here relative and points a page of the other site at it', () => {
    const md = '[a](user-guide.md#top) [b](./dev-guide.md)'
    expect(rewriteLinks(md, manifest, docsSite.site)).toBe(
      '[a](./user-guide#top) [b](https://meddleware.dev/sui/onchain/access-gate/dev-guide)',
    )
    expect(rewriteLinks(md, manifest, devSite.site)).toBe(
      '[a](https://docs.meddleware.co.uk/blockchain/sui/onchain/access-gate/user-guide#top) [b](./dev-guide)',
    )
  })

  it('sends any other relative link to the repository and leaves absolute ones alone', () => {
    expect(rewriteLinks('[s](../../SECURITY.md#x) [f](other.md) [w](https://x.test/a.md) [m](mailto:a@b.c) [h](#h) [r](/abs)', manifest, docsSite.site)).toBe(
      '[s](https://github.com/example/access-gate-sui/blob/main/SECURITY.md#x) [f](https://github.com/example/access-gate-sui/blob/main/docs/onchain/other.md) [w](https://x.test/a.md) [m](mailto:a@b.c) [h](#h) [r](/abs)',
    )
  })
})

describe('generateOnchain', () => {
  it('copies the pages for this site under outBase, with rewritten links and a source footer, and writes the sidebar', () => {
    // docs-site publishes the overview and the user guide; the developer guide belongs to dev-site, so it is not copied here.
    const { sidebar } = generate(docsSite)
    const overview = read('docs/blockchain/sui/onchain/access-gate/overview.md')
    // The links: a page on this site stays relative, a page of the other site becomes an absolute URL there, and a repo file becomes a GitHub URL.
    expect(overview).toContain('[guide](./user-guide#top), [dev](https://meddleware.dev/sui/onchain/access-gate/dev-guide), [sec](https://github.com/example/access-gate-sui/blob/main/SECURITY.md#x)')
    expect(overview).toContain('Canonical source: [`@meddleware/access-gate-sui` → `docs/onchain/overview.md`](https://github.com/example/access-gate-sui/blob/main/docs/onchain/overview.md)')
    expect(existsSync(join(site.root, 'docs/blockchain/sui/onchain/access-gate/user-guide.md'))).toBe(true)
    expect(existsSync(join(site.root, 'docs/blockchain/sui/onchain/access-gate/dev-guide.md'))).toBe(false)
    expect(sidebar[0]).toEqual({
      text: 'Access Gate (on-chain)',
      collapsed: true,
      items: [
        { text: 'Overview', link: '/blockchain/sui/onchain/access-gate/overview' },
        { text: 'User guide', link: '/blockchain/sui/onchain/access-gate/user-guide' },
      ],
    })
    // The sidebar is also written to disk, where the site's VitePress config reads it.
    expect(JSON.parse(read('docs/.vitepress/generated/onchain-sidebar.json'))).toEqual(sidebar)
  })

  it('uses the site id and base from the configuration', () => {
    generate(devSite)
    expect(existsSync(join(site.root, 'docs/sui/onchain/access-gate/dev-guide.md'))).toBe(true)
    expect(existsSync(join(site.root, 'docs/sui/onchain/access-gate/user-guide.md'))).toBe(false)
    expect(read('docs/sui/onchain/access-gate/overview.md')).toContain('[guide](https://docs.meddleware.co.uk/blockchain/sui/onchain/access-gate/user-guide#top), [dev](./dev-guide)')
  })

  it('warns and skips a page the manifest lists but the package lacks, and writes placeholders for packages that are not there', () => {
    const { failures, sidebar } = generate(docsSite)
    expect(failures).toBe(1 + (PACKAGES.length - 1))
    expect(console.warn).toHaveBeenCalledWith('[gen:onchain] @meddleware/access-gate-sui: missing gone.md — skipped.')
    expect(console.warn).toHaveBeenCalledWith('[gen:onchain] @meddleware/sealed-storage-sui: no docs/onchain/manifest.json in the resolved package — writing placeholder.')
    expect(sidebar).toHaveLength(PACKAGES.length)
    for (const name of ['overview', 'user-guide', 'dev-guide', 'api-reference']) {
      expect(read(`docs/blockchain/sui/onchain/sealed-storage/${name}.md`)).toContain('`@meddleware/sealed-storage-sui` could not be loaded (no docs/onchain/manifest.json in the resolved package)')
    }
    expect(sidebar[1]).toEqual({ text: 'Sealed Storage policies (on-chain)', collapsed: true, items: [{ text: 'On-chain overview', link: '/blockchain/sui/onchain/sealed-storage/overview' }] })
  })

  it('writes a placeholder when the manifest lists no pages for this site', () => {
    source.writeJson('access-gate-sui/docs/onchain/manifest.json', { ...manifest, pages: [{ file: 'dev-guide.md', title: 'Dev', sites: ['dev'] }] })
    const { sidebar } = generate(docsSite)
    expect(sidebar[0].text).toBe('Access Gate (on-chain)')
    expect(read('docs/blockchain/sui/onchain/access-gate/overview.md')).toContain('manifest lists no pages for this site')
  })

  it('removes what a previous run left under outBase', () => {
    make(docsSite)
    site.write('docs/blockchain/sui/onchain/stale/x.md', 'old')
    generateOnchain({ root: site.root, docsRootOverride: source.root })
    expect(existsSync(join(site.root, 'docs/blockchain/sui/onchain/stale'))).toBe(false)
  })

  it('resolves an installed package from the site root when there is no override', () => {
    make(docsSite)
    site.write('node_modules/@meddleware/access-gate-sui/package.json', JSON.stringify({ name: '@meddleware/access-gate-sui', version: '0.0.0' }))
    mkdirSync(join(site.root, 'node_modules/@meddleware/access-gate-sui/docs/onchain'), { recursive: true })
    site.writeJson('node_modules/@meddleware/access-gate-sui/docs/onchain/manifest.json', { ...manifest, pages: [manifest.pages[0]] })
    site.write('node_modules/@meddleware/access-gate-sui/docs/onchain/overview.md', '# Installed\n')
    generateOnchain({ root: site.root, docsRootOverride: '' })
    expect(read('docs/blockchain/sui/onchain/access-gate/overview.md')).toContain('# Installed')
    expect(read('docs/blockchain/sui/onchain/sealed-storage/overview.md')).toContain('package not installed')
  })

  it('reads the site from package.json by default and fails closed without it', () => {
    make(docsSite)
    generateOnchain({ root: site.root, docsRootOverride: source.root })
    expect(existsSync(join(site.root, 'docs/blockchain/sui/onchain/access-gate/overview.md'))).toBe(true)
    site.writeJson('package.json', { name: 'x' })
    expect(() => generateOnchain({ root: site.root, docsRootOverride: source.root })).toThrow('"meddleware" must be an object')
  })
})
