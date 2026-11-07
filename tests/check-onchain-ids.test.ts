import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkOnchainIds, checkSite, loadDeployments } from '../src/bin/check-onchain-ids.js'
import { deployments, devSite, docsSite, hex, TempSite } from './helpers/site'

// The unit tests of docs-site and dev-site, ported: the same scenarios against each site's configuration.
let docsRoot: string
const write = (rel: string, text: string) => {
  mkdirSync(dirname(join(docsRoot, rel)), { recursive: true })
  writeFileSync(join(docsRoot, rel), text)
}

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'onchain-ids-'))
})
afterEach(() => rmSync(docsRoot, { recursive: true, force: true }))

describe('checkOnchainIds, as docs-site configures it', () => {
  const { required, skipDirs } = docsSite.onchainIds
  const options = () => ({ docsRoot, deployments, required, skipDirs, generated: docsSite.site.outBase })
  const goodPages = () => {
    write('blockchain/sui/access-gate/reference.md', `| a | \`${hex('a')}\` |\n| b | \`${hex('b')}\` |\n`)
    write('blockchain/sui/treasury/reference.md', `${hex('a')} ${hex('b')}`)
    write('blockchain/sui/sealed-storage/reference.md', `${hex('c')} ${hex('d')}`)
  }

  it('passes when every page shows the current ids', () => {
    goodPages()
    expect(checkOnchainIds(options())).toEqual([])
  })

  it('fails on a superseded id in a reference page', () => {
    goodPages()
    write('blockchain/sui/treasury/reference.md', `${hex('e')} ${hex('b')}`)
    const problems = checkOnchainIds(options())
    expect(problems.some((p) => p.includes('treasury/reference.md') && p.includes('not a current deployment id'))).toBe(true)
    expect(problems.some((p) => p.includes('does not show accessGate.originalId'))).toBe(true)
  })

  it('fails when a required id is missing', () => {
    goodPages()
    write('blockchain/sui/sealed-storage/reference.md', hex('c'))
    expect(checkOnchainIds(options())).toEqual([expect.stringContaining('does not show sealPolicies.policyConfigId')])
  })

  it('fails on a stale id in any hand-written page, case-insensitively', () => {
    goodPages()
    write('blockchain/sui/guide.md', `see 0x${'E'.repeat(64)}`)
    expect(checkOnchainIds(options())).toEqual([expect.stringContaining('guide.md')])
  })

  it('ignores the audit, generated onchain and api trees', () => {
    goodPages()
    write('audit/a-audit.md', hex('f'))
    write('blockchain/sui/onchain/access-gate/overview.md', hex('f'))
    write('blockchain/sui/walrus-storage/api/x.md', hex('f'))
    write('blockchain/sui/walrus-storage/wire-api/x.md', hex('f'))
    write('.vitepress/notes.md', hex('f'))
    write('node_modules/x/readme.md', hex('f'))
    expect(checkOnchainIds(options())).toEqual([])
  })

  it('scans a tree that is only named like the generated one, and the api tree when it is not configured', () => {
    goodPages()
    write('blockchain/sui/other/onchain/x.md', hex('f'))
    expect(checkOnchainIds(options())).toEqual([expect.stringContaining('other/onchain/x.md')])
    rmSync(join(docsRoot, 'blockchain/sui/other'), { recursive: true })
    write('blockchain/sui/walrus-storage/api/x.md', hex('f'))
    expect(checkOnchainIds({ ...options(), skipDirs: [] })).toEqual([expect.stringContaining('api/x.md')])
  })

  it('does not treat short hex literals as ids', () => {
    goodPages()
    write('blockchain/sui/short.md', 'type 0x2::sui::SUI and 0xd7ddaa94…')
    expect(checkOnchainIds(options())).toEqual([])
  })

  it('reports a missing reference page', () => {
    expect(checkOnchainIds(options()).filter((p) => p.includes('not found'))).toHaveLength(Object.keys(required).length)
  })

  it('reports a required name the deployments record lacks', () => {
    goodPages()
    expect(checkOnchainIds({ ...options(), required: { 'blockchain/sui/treasury/reference.md': ['accessGate.nope'] } })).toEqual([
      'blockchain/sui/treasury/reference.md: deployments record has no accessGate.nope',
    ])
  })
})

describe('checkOnchainIds, as dev-site configures it', () => {
  const { required, otherIds } = devSite.onchainIds
  const options = () => ({ docsRoot, deployments, required, otherIds: otherIds.map((o) => o.id), generated: devSite.site.outBase })
  const goodPages = () => write('sui/index.md', `| a | \`${hex('a')}\` | b \`${hex('b')}\` |\n| c | \`${hex('c')}\` | d \`${hex('d')}\` |\n`)

  it('passes when the reference page shows the current ids', () => {
    goodPages()
    expect(checkOnchainIds(options())).toEqual([])
  })

  it('fails on a superseded id in the reference page', () => {
    goodPages()
    write('sui/index.md', `${hex('e')} ${hex('b')} ${hex('c')} ${hex('d')}`)
    const problems = checkOnchainIds(options())
    expect(problems.some((p) => p.includes('sui/index.md') && p.includes('not a current deployment id'))).toBe(true)
  })

  it('ignores the audit tree and the generated onchain tree', () => {
    goodPages()
    write('audit/a-audit.md', hex('f'))
    write('sui/onchain/access-gate/overview.md', hex('f'))
    expect(checkOnchainIds(options())).toEqual([])
  })

  it('allows the listed key-server ids and nothing else off-list', () => {
    goodPages()
    const keyServer = otherIds[0].id
    write('sui/seal.md', keyServer)
    expect(checkOnchainIds(options())).toEqual([])
    write('sui/seal.md', keyServer.replace(/.$/, '0'))
    expect(checkOnchainIds(options())).toEqual([expect.stringContaining('seal.md')])
  })

  it('does not allow the key-server ids when none are configured', () => {
    goodPages()
    write('sui/seal.md', otherIds[0].id)
    expect(checkOnchainIds({ ...options(), otherIds: [] })).toEqual([expect.stringContaining('seal.md')])
  })
})

describe('loadDeployments and checkSite, against installed clients', () => {
  let site: TempSite
  beforeEach(() => {
    site = new TempSite(docsSite)
    site.installClients()
  })
  afterEach(() => site.remove())

  it('reads testnet deployments from both clients, resolved from the site root', async () => {
    expect(await loadDeployments(site.root)).toEqual(deployments)
  })

  it('fails closed when a client is not installed or exports no testnet deployment', async () => {
    rmSync(join(site.root, 'node_modules/@meddleware/sealed-storage-client'), { recursive: true })
    await expect(loadDeployments(site.root)).rejects.toThrow()
    site.installClients({ accessGate: deployments.accessGate, sealPolicies: deployments.sealPolicies })
    site.write('node_modules/@meddleware/access-gate-client/deployments.ts', 'export const ACCESS_GATE_DEPLOYMENTS: Record<string, unknown> = {}\n')
    await expect(loadDeployments(site.root)).rejects.toThrow('a client exports no testnet deployment')
  })

  it('checks the pages of the site from its configuration', async () => {
    site.write('docs/blockchain/sui/access-gate/reference.md', `${hex('a')} ${hex('b')}`)
    site.write('docs/blockchain/sui/treasury/reference.md', `${hex('a')} ${hex('b')}`)
    site.write('docs/blockchain/sui/sealed-storage/reference.md', `${hex('c')} ${hex('d')}`)
    site.write('docs/blockchain/sui/onchain/x.md', hex('f'))
    expect(await checkSite(site.root)).toEqual([])
    site.write('docs/blockchain/sui/guide.md', hex('e'))
    expect(await checkSite(site.root)).toEqual([expect.stringContaining('guide.md')])
  })

  it('rejects when the configuration is missing', async () => {
    site.writeJson('package.json', { name: 'x' })
    await expect(checkSite(site.root)).rejects.toThrow('"meddleware" must be an object')
  })
})
