import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const hex = (c: string) => `0x${c.repeat(64)}`
export const deployments = {
  accessGate: { originalId: hex('a'), publishedAt: hex('a'), platformConfigId: hex('b') },
  sealPolicies: { originalId: hex('c'), publishedAt: hex('c'), policyConfigId: hex('d') },
}

export const bins = {
  'mw-gen-llms-full': 'gen-llms-full.js',
  'mw-check-dist-no-audit': 'check-dist-no-audit.js',
  'mw-gen-onchain': 'gen-onchain.js',
  'mw-check-onchain-ids': 'check-onchain-ids.js',
} as const

const created: TempSite[] = []

/** Removes every site made since the last call; run it after each test. */
export function cleanupSites(): void {
  for (const site of created.splice(0)) site.remove()
}

/** A throw-away site repository: a root with a package.json, written files, and `node_modules/.bin` links to the bins. */
export class TempSite {
  readonly root = mkdtempSync(join(tmpdir(), 'site-scripts-'))

  constructor(meddleware?: unknown) {
    created.push(this)
    this.writeJson('package.json', { name: 'site', type: 'module', meddleware })
    for (const [name, file] of Object.entries(bins)) {
      mkdirSync(join(this.root, 'node_modules/.bin'), { recursive: true })
      symlinkSync(join(import.meta.dirname, '..', '..', 'src', 'bin', file), join(this.root, 'node_modules/.bin', name))
    }
  }

  write(rel: string, text: string): void {
    mkdirSync(dirname(join(this.root, rel)), { recursive: true })
    writeFileSync(join(this.root, rel), text)
  }

  writeJson(rel: string, value: unknown): void {
    this.write(rel, JSON.stringify(value, null, 2))
  }

  /** The two deployment clients, as the check reads them: TypeScript source under `node_modules`. */
  installClients(value = deployments): void {
    this.write('node_modules/@meddleware/access-gate-client/package.json', JSON.stringify({ name: '@meddleware/access-gate-client', version: '0.0.0', exports: { './deployments': './deployments.ts' } }))
    this.write('node_modules/@meddleware/access-gate-client/deployments.ts', `export const ACCESS_GATE_DEPLOYMENTS: Record<string, unknown> = { testnet: ${JSON.stringify(value.accessGate)} }\n`)
    this.write('node_modules/@meddleware/sealed-storage-client/package.json', JSON.stringify({ name: '@meddleware/sealed-storage-client', version: '0.0.0', exports: { './deployments': './deployments.ts' } }))
    this.write('node_modules/@meddleware/sealed-storage-client/deployments.ts', `export const SEAL_POLICIES_DEPLOYMENTS: Record<string, unknown> = { testnet: ${JSON.stringify(value.sealPolicies)} }\n`)
  }

  /** Runs a bin through its `node_modules/.bin` symlink, from the site root, as an installed bin runs. */
  run(bin: keyof typeof bins, args: string[] = [], env: Record<string, string> = {}) {
    return spawnSync(join(this.root, 'node_modules/.bin', bin), args, { cwd: this.root, encoding: 'utf8', env: { ...process.env, ONCHAIN_DOCS_ROOT: '', ...env } })
  }

  remove(): void {
    rmSync(this.root, { recursive: true, force: true })
  }
}

export const docsSite = {
  site: { id: 'docs', outBase: 'blockchain/sui/onchain', otherSite: { id: 'dev', origin: 'https://meddleware.dev', base: 'sui/onchain' } },
  onchainIds: {
    required: {
      'blockchain/sui/access-gate/reference.md': ['accessGate.originalId', 'accessGate.platformConfigId'],
      'blockchain/sui/treasury/reference.md': ['accessGate.originalId', 'accessGate.platformConfigId'],
      'blockchain/sui/sealed-storage/reference.md': ['sealPolicies.originalId', 'sealPolicies.policyConfigId'],
    },
    skipDirs: ['api', 'wire-api'],
  },
}

export const devSite = {
  site: { id: 'dev', outBase: 'sui/onchain', otherSite: { id: 'docs', origin: 'https://docs.meddleware.co.uk', base: 'blockchain/sui/onchain' } },
  onchainIds: {
    required: { 'sui/index.md': ['accessGate.originalId', 'accessGate.platformConfigId', 'sealPolicies.originalId', 'sealPolicies.policyConfigId'] },
    otherIds: [
      { id: '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98', reason: 'Mysten testnet committee (aggregator)' },
      { id: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', reason: 'independent testnet key server' },
    ],
  },
}
