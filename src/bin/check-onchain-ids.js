#!/usr/bin/env node
// @ts-check
// Build-time drift check for the on-chain ids typed into the hand-written pages.
//
// The canonical record of a deployment is the generated `deployments` export of the published
// clients (`@meddleware/access-gate-client`, `@meddleware/sealed-storage-client`), which come from the Move
// packages' own `Published.toml`. A site must not carry a second, hand-maintained copy that can
// silently lag a republication, so the check fails when:
//   1. a hand-written page contains a 32-byte `0x…` id that is not a current testnet id of either
//      deployment (nor an allow-listed non-deployment id, with its reason), or
//   2. a "Deployed identifiers" reference page lacks one of the ids it is required to show.
//
// Scope of 1: every Markdown page under docs/ except the audit tree (never published), the generated
// on-chain tree (`meddleware.site.outBase`) and the configured `skipDirs` (generated API trees).
// Fails closed: if a client or its deployments record cannot be read, or the configuration is missing or malformed, the check fails
// instead of passing vacuously. Run from the site's root; the clients and `typescript` resolve from there.
//
// Configured in the site's package.json (see the README, "Site scripts"):
//   "meddleware": { "site": { "outBase": "…" }, "onchainIds": { "required": { "<page>": ["accessGate.originalId"] },
//                   "otherIds": [{ "id": "0x…", "reason": "…" }], "skipDirs": ["api"] } }
//
// Usage: mw-check-onchain-ids
import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isEntryPoint } from '../entry-point.js'
import { readOnchainIdsConfig } from '../site-config.js'

const ID = /0x[0-9a-fA-F]{64}\b/g

/** Directories no site publishes from: dependencies, VitePress's own, and the internal audit. */
const ALWAYS_SKIPPED = ['node_modules', '.vitepress', 'audit']

/**
 * `typescript` from the site (its devDependency), else from beside this package.
 * @param {string} resolveFrom
 * @returns {Promise<typeof import('typescript')>}
 */
async function loadTypeScript(resolveFrom) {
  try {
    const path = createRequire(join(resolveFrom, 'package.json')).resolve('typescript')
    return (await import(pathToFileURL(path).href)).default
  } catch {
    return (await import('typescript')).default
  }
}

// The clients ship TypeScript source (no JS build) and Node does not strip types inside
// node_modules, so transpile the (import-free, generated) deployments file and import the result.
/**
 * @param {string} file
 * @param {string} resolveFrom
 * @returns {Promise<Record<string, any>>}
 */
async function loadTsModule(file, resolveFrom) {
  const ts = await loadTypeScript(resolveFrom)
  const out = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`)
}

/**
 * Reads the current deployments out of the installed clients.
 * @param {string} [resolveFrom] the site's root (default: the current directory)
 * @returns {Promise<{ accessGate: Record<string, unknown>, sealPolicies: Record<string, unknown> }>}
 */
export async function loadDeployments(resolveFrom = process.cwd()) {
  const require = createRequire(join(resolveFrom, 'package.json'))
  const gate = await loadTsModule(require.resolve('@meddleware/access-gate-client/deployments'), resolveFrom)
  const seal = await loadTsModule(require.resolve('@meddleware/sealed-storage-client/deployments'), resolveFrom)
  const testnetGate = gate.ACCESS_GATE_DEPLOYMENTS?.testnet
  const testnetSeal = seal.SEAL_POLICIES_DEPLOYMENTS?.testnet
  if (!testnetGate || !testnetSeal) throw new Error('a client exports no testnet deployment')
  return { accessGate: testnetGate, sealPolicies: testnetSeal }
}

/**
 * @param {string} dir
 * @param {string} base
 * @param {{ skipDirs: Iterable<string>, generated: string }} skip directory names skipped at any depth, and the generated tree (a path under `base`)
 * @returns {Generator<[string, string]>} `[path under base, absolute path]` of every Markdown file
 */
function* markdownFiles(dir, base, skip) {
  const names = new Set([...ALWAYS_SKIPPED, ...skip.skipDirs])
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    const rel = relative(base, p).split(sep).join('/')
    if (entry.isDirectory()) {
      if (names.has(entry.name) || rel === skip.generated) continue
      yield* markdownFiles(p, base, skip)
    } else if (entry.name.endsWith('.md')) {
      yield [rel, p]
    }
  }
}

/**
 * @param {Record<string, any>} deployments
 * @param {string} name dotted, e.g. `accessGate.originalId`
 * @returns {unknown}
 */
const lookup = (deployments, name) => name.split('.').reduce((o, k) => o?.[k], deployments)

/**
 * Returns a list of problems (empty when the pages agree with the deployments).
 * @param {object} options
 * @param {string} options.docsRoot
 * @param {Record<string, Record<string, unknown>>} options.deployments
 * @param {Record<string, string[]>} options.required page path under `docsRoot` → required ids, by dotted name
 * @param {Iterable<string>} [options.otherIds] lower-case non-deployment ids that may appear
 * @param {Iterable<string>} [options.skipDirs] directory names skipped at any depth, besides `node_modules`, `.vitepress` and `audit`
 * @param {string} [options.generated] the generated on-chain tree, a path under `docsRoot`
 * @returns {string[]}
 */
export function checkOnchainIds({ docsRoot, deployments, required, otherIds = [], skipDirs = [], generated = '' }) {
  const known = new Set(otherIds)
  for (const group of Object.values(deployments)) {
    for (const v of Object.values(group)) if (typeof v === 'string' && /^0x[0-9a-f]{64}$/.test(v)) known.add(v)
  }
  /** @type {string[]} */
  const problems = []
  /** @type {Map<string, string>} */
  const pages = new Map()
  for (const [rel, file] of markdownFiles(docsRoot, docsRoot, { skipDirs, generated })) pages.set(rel, readFileSync(file, 'utf8'))
  for (const [rel, text] of pages) {
    for (const id of new Set(text.match(ID) ?? [])) {
      if (!known.has(id.toLowerCase())) problems.push(`${rel}: ${id} is not a current deployment id (stale or mistyped)`)
    }
  }
  for (const [rel, names] of Object.entries(required)) {
    const text = pages.get(rel)
    if (text === undefined) {
      problems.push(`${rel}: required reference page not found`)
      continue
    }
    for (const name of names) {
      const id = lookup(deployments, name)
      if (typeof id !== 'string') problems.push(`${rel}: deployments record has no ${name}`)
      else if (!text.includes(id)) problems.push(`${rel}: does not show ${name} (${id})`)
    }
  }
  return problems
}

/**
 * The whole check for the site at `root`: its configuration, the clients' deployments, the pages.
 * @param {string} [root] the site's root (default: the current directory)
 * @returns {Promise<string[]>} the problems; rejects when the configuration or a client cannot be read
 */
export async function checkSite(root = process.cwd()) {
  const { required, otherIds, skipDirs, outBase } = readOnchainIdsConfig(root)
  return checkOnchainIds({ docsRoot: join(root, 'docs'), deployments: await loadDeployments(root), required, otherIds: otherIds.keys(), skipDirs, generated: outBase })
}

if (isEntryPoint(import.meta.url)) {
  let problems
  try {
    problems = await checkSite()
  } catch (err) {
    console.error(`mw-check-onchain-ids: cannot run the check: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
  if (problems.length) {
    console.error('mw-check-onchain-ids: reference pages drifted from the clients\' deployments:')
    for (const p of problems) console.error(`  ${p}`)
    console.error('Edit the page to the id in @meddleware/access-gate-client / sealed-storage-client `deployments`.')
    process.exit(1)
  }
  console.log('mw-check-onchain-ids: every on-chain id in the pages matches the clients\' deployments.')
}
