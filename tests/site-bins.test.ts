import { lstatSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import { bins, cleanupSites, deployments, devSite, docsSite, hex, TempSite } from './helpers/site'

let site: TempSite
afterEach(cleanupSites)

describe('the package', () => {
  it('lists every bin, with a shebang, executable, and in the published files', () => {
    expect(Object.keys(pkg.bin).sort()).toEqual(Object.keys(bins).sort())
    for (const [name, rel] of Object.entries(pkg.bin)) {
      const file = join(import.meta.dirname, '..', rel)
      expect(readFileSync(file, 'utf8').startsWith('#!/usr/bin/env node\n'), name).toBe(true)
      expect(statSync(file).mode & 0o111, name).toBe(0o111)
      expect(rel.startsWith('./'), name).toBe(false) // npm strips a leading ./ and would rewrite the field
      expect(pkg.files.some((f) => rel.startsWith(`${f}/`)), name).toBe(true)
    }
  })

  it('has no stray bin file: every file under src/bin is a listed bin', () => {
    const listed = new Set(Object.values(pkg.bin).map((rel) => rel.replace('src/bin/', '')))
    expect(new Set(readdirSync(join(import.meta.dirname, '..', 'src', 'bin')))).toEqual(listed)
  })
})

describe('each bin, run through its node_modules/.bin symlink from the site root', () => {
  it('is a symlink, as an installed bin is', () => {
    site = new TempSite()
    expect(lstatSync(join(site.root, 'node_modules/.bin/mw-gen-onchain')).isSymbolicLink()).toBe(true)
  })

  it('mw-gen-llms-full writes dist/llms-full.txt, and needs both arguments', () => {
    site = new TempSite()
    mkdirSync(join(site.root, 'dist'))
    site.write('docs/index.md', '# Home\n')
    const bad = site.run('mw-gen-llms-full', ['https://e.test'])
    expect(bad.status).toBe(2)
    expect(bad.stderr).toContain('usage: mw-gen-llms-full')
    const ok = site.run('mw-gen-llms-full', ['https://e.test', 'Title'])
    expect(ok.status).toBe(0)
    expect(ok.stdout).toBe('llms-full.txt: 1 pages\n')
    expect(readFileSync(join(site.root, 'dist/llms-full.txt'), 'utf8')).toContain('Source: https://e.test/')
  })

  it('mw-gen-llms-full fails without dist/', () => {
    site = new TempSite()
    site.write('docs/index.md', '# Home\n')
    const r = site.run('mw-gen-llms-full', ['https://e.test', 'Title'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('dist/ is missing')
  })

  it('mw-check-dist-no-audit passes a clean dist (default and given directory) and fails on audit material or a missing directory', () => {
    site = new TempSite()
    site.write('dist/index.html', '')
    expect(site.run('mw-check-dist-no-audit').stdout).toBe('dist check: no audit page in the built site.\n')
    site.write('other/index.html', '')
    expect(site.run('mw-check-dist-no-audit', ['other']).status).toBe(0)
    site.write('dist/audit/index.html', '')
    const r = site.run('mw-check-dist-no-audit')
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('  audit\n')
    expect(site.run('mw-check-dist-no-audit', ['missing']).status).toBe(1)
  })

  it('mw-gen-onchain generates from ONCHAIN_DOCS_ROOT, fails soft on missing packages, and fails closed without configuration', () => {
    site = new TempSite(devSite)
    const sibling = new TempSite()
    sibling.writeJson('access-gate-sui/docs/onchain/manifest.json', {
      package: '@meddleware/access-gate-sui', slug: 'access-gate', title: 'Access Gate', repository: 'https://github.com/x/y', pages: [{ file: 'overview.md', title: 'Overview', sites: ['dev'] }],
    })
    sibling.write('access-gate-sui/docs/onchain/overview.md', '# Overview\n')
    const r = site.run('mw-gen-onchain', [], { ONCHAIN_DOCS_ROOT: sibling.root })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('[gen:onchain] @meddleware/access-gate-sui: 1 page(s) → docs/sui/onchain/access-gate')
    expect(r.stderr).toContain('completed with 2 placeholder(s)/gap(s); site still builds.')
    expect(readFileSync(join(site.root, 'docs/sui/onchain/access-gate/overview.md'), 'utf8')).toContain('# Overview')
    expect(JSON.parse(readFileSync(join(site.root, 'docs/.vitepress/generated/onchain-sidebar.json'), 'utf8'))).toHaveLength(3)
    sibling.remove()

    site.writeJson('package.json', { name: 'x', meddleware: { site: { ...devSite.site, outBase: undefined } } })
    const bad = site.run('mw-gen-onchain')
    expect(bad.status).toBe(1)
    expect(bad.stderr).toContain('mw-gen-onchain: package.json "meddleware.site.outBase"')
  })

  it('mw-check-onchain-ids passes, fails on a stale id, and fails closed without clients or configuration', () => {
    site = new TempSite(docsSite)
    site.installClients()
    site.write('docs/blockchain/sui/access-gate/reference.md', `${hex('a')} ${hex('b')}`)
    site.write('docs/blockchain/sui/treasury/reference.md', `${hex('a')} ${hex('b')}`)
    site.write('docs/blockchain/sui/sealed-storage/reference.md', `${hex('c')} ${hex('d')}`)
    const ok = site.run('mw-check-onchain-ids')
    expect(ok.status, ok.stderr).toBe(0)
    expect(ok.stdout).toContain('every on-chain id in the pages matches')

    site.write('docs/blockchain/sui/guide.md', hex('e'))
    const stale = site.run('mw-check-onchain-ids')
    expect(stale.status).toBe(1)
    expect(stale.stderr).toContain(`blockchain/sui/guide.md: ${hex('e')} is not a current deployment id`)
    site.write('docs/blockchain/sui/guide.md', 'fine')

    site.write('node_modules/@meddleware/access-gate-client/deployments.ts', 'export const ACCESS_GATE_DEPLOYMENTS = {}\n')
    const none = site.run('mw-check-onchain-ids')
    expect(none.status).toBe(1)
    expect(none.stderr).toContain('a client exports no testnet deployment')
    site.installClients(deployments)

    site.writeJson('package.json', { name: 'x' })
    const bad = site.run('mw-check-onchain-ids')
    expect(bad.status).toBe(1)
    expect(bad.stderr).toContain('"meddleware" must be an object')
  })

  it('every bin also runs when linked from elsewhere (the guard compares real paths, not the argument)', () => {
    site = new TempSite()
    mkdirSync(join(site.root, 'linked'))
    symlinkSync(join(import.meta.dirname, '..', 'src', 'bin', 'check-dist-no-audit.js'), join(site.root, 'linked', 'anything'))
    site.write('dist/index.html', '')
    const r = site.run('mw-check-dist-no-audit')
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('no audit page')
  })
})
