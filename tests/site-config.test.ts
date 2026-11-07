import { afterEach, describe, expect, it } from 'vitest'
import { readMeddlewareConfig, readOnchainIdsConfig, readSiteConfig } from '../src/site-config.js'
import { cleanupSites, devSite, docsSite, TempSite } from './helpers/site'

let site: TempSite
afterEach(cleanupSites)
const make = (meddleware?: unknown) => (site = new TempSite(meddleware))
const clone = <T>(value: T): T => structuredClone(value)

describe('readSiteConfig', () => {
  it('reads the site id, the output base and the other site', () => {
    expect(readSiteConfig(make(docsSite).root)).toEqual(docsSite.site)
  })

  it('fails without a meddleware section, a site, or an other site', () => {
    expect(() => readSiteConfig(make().root)).toThrow('"meddleware" must be an object')
    expect(() => readSiteConfig(make({}).root)).toThrow('"meddleware.site" must be an object')
    expect(() => readSiteConfig(make({ site: { id: 'docs', outBase: 'x' } }).root)).toThrow('"meddleware.site.otherSite" must be an object')
  })

  it('fails on an empty or non-string id', () => {
    const bad = clone(docsSite)
    bad.site.id = ' '
    expect(() => readSiteConfig(make(bad).root)).toThrow('"meddleware.site.id" must be a non-empty string')
    ;(bad.site as { id: unknown }).id = 7
    expect(() => readSiteConfig(make(bad).root)).toThrow('"meddleware.site.id"')
  })

  it.each(['/abs', 'trailing/', '../up', 'a/../b', 'a//b', 'back\\slash'])('refuses the output base %j', (outBase) => {
    const bad = clone(docsSite)
    bad.site.outBase = outBase
    expect(() => readSiteConfig(make(bad).root)).toThrow('"meddleware.site.outBase" must be a relative path')
  })

  it('refuses an origin with a path or no scheme', () => {
    for (const origin of ['meddleware.dev', 'https://meddleware.dev/docs', 'ftp://x']) {
      const bad = clone(docsSite)
      bad.site.otherSite.origin = origin
      expect(() => readSiteConfig(make(bad).root)).toThrow('otherSite.origin')
    }
  })

  it('fails when package.json is missing or not an object', () => {
    site = new TempSite()
    site.write('package.json', '[]')
    expect(() => readMeddlewareConfig(site.root)).toThrow('is not a JSON object')
    site.write('package.json', '{')
    expect(() => readMeddlewareConfig(site.root)).toThrow('cannot read')
  })
})

describe('readOnchainIdsConfig', () => {
  it('reads required pages, other ids with their reasons, skipped directories, and the generated tree from the site', () => {
    const c = readOnchainIdsConfig(make(docsSite).root)
    expect(c.outBase).toBe('blockchain/sui/onchain')
    expect(c.skipDirs).toEqual(new Set(['api', 'wire-api']))
    expect(c.otherIds.size).toBe(0)
    expect(Object.keys(c.required)).toHaveLength(3)

    const d = readOnchainIdsConfig(make(devSite).root)
    expect(d.outBase).toBe('sui/onchain')
    expect(d.skipDirs.size).toBe(0)
    expect([...d.otherIds.values()]).toEqual(['Mysten testnet committee (aggregator)', 'independent testnet key server'])
  })

  it('needs the onchainIds section, and site.outBase to derive the generated tree', () => {
    expect(() => readOnchainIdsConfig(make({ site: docsSite.site }).root)).toThrow('"meddleware.onchainIds" must be an object')
    expect(() => readOnchainIdsConfig(make({ onchainIds: docsSite.onchainIds }).root)).toThrow('"meddleware.site" must be an object')
  })

  it('refuses a check that checks nothing: required must name a page with ids', () => {
    const bad = clone(docsSite)
    ;(bad.onchainIds as { required: unknown }).required = {}
    expect(() => readOnchainIdsConfig(make(bad).root)).toThrow('must name at least one page')
    ;(bad.onchainIds.required as Record<string, string[]>)['p.md'] = []
    expect(() => readOnchainIdsConfig(make(bad).root)).toThrow('non-empty array')
  })

  it('refuses an other id that is not 32 lower-case hex bytes or has no reason', () => {
    for (const entry of [{ id: '0x12', reason: 'r' }, { id: `0x${'A'.repeat(64)}`, reason: 'r' }, { id: `0x${'a'.repeat(64)}` }, { id: `0x${'a'.repeat(64)}`, reason: '' }]) {
      const bad = { ...clone(devSite), onchainIds: { ...clone(devSite.onchainIds), otherIds: [entry] } }
      expect(() => readOnchainIdsConfig(make(bad).root)).toThrow('otherIds[0]')
    }
  })

  it('refuses a skipped directory that is a path', () => {
    const bad = clone(docsSite)
    bad.onchainIds.skipDirs = ['a/b']
    expect(() => readOnchainIdsConfig(make(bad).root)).toThrow('is a directory name, not a path')
  })
})
