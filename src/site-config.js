// @ts-check
// The `"meddleware"` section of the consuming site's package.json, read by the site-script bins (mw-gen-onchain,
// mw-check-onchain-ids). Every reader validates what it needs and throws a `package.json "meddleware.…"` message on anything
// missing or malformed: the bins fail closed rather than guess a default.
//
//   "meddleware": {
//     "site": { "id": "docs", "outBase": "blockchain/sui/onchain", "otherSite": { "id": "dev", "origin": "https://meddleware.dev", "base": "sui/onchain" } },
//     "onchainIds": { "required": { "page.md": ["accessGate.originalId"] }, "otherIds": [{ "id": "0x…", "reason": "…" }], "skipDirs": ["api"] }
//   }
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @typedef {object} SiteConfig
 * @property {string} id this site's id in an on-chain manifest's `sites` list ("docs", "dev")
 * @property {string} outBase where the imported pages go, under `docs/` and relative to the site root (no leading slash)
 * @property {{ id: string, origin: string, base: string }} otherSite the sibling site that publishes the pages this one leaves out
 */

/**
 * @typedef {object} OnchainIdsConfig
 * @property {Record<string, string[]>} required page path under `docs/` → deployment ids it must show, by dotted name
 * @property {Map<string, string>} otherIds allowed 32-byte ids that are not deployments (lower case) → reason
 * @property {Set<string>} skipDirs directory names skipped at any depth, besides `node_modules`, `.vitepress` and `audit`
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string}
 */
function text(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`package.json "${path}" must be a non-empty string`)
  return value
}

/**
 * A relative, forward-slash path under `docs/` that cannot leave it.
 * @param {unknown} value
 * @param {string} path
 * @returns {string}
 */
function relativePath(value, path) {
  const rel = text(value, path)
  if (rel.startsWith('/') || rel.endsWith('/') || rel.includes('\\') || rel.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`package.json "${path}" must be a relative path of plain segments, without a leading or trailing slash (got "${rel}")`)
  }
  return rel
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
function object(value, path) {
  if (!isObject(value)) throw new Error(`package.json "${path}" must be an object`)
  return value
}

/**
 * The `"meddleware"` section of `<root>/package.json`.
 * @param {string} root the consuming repository's root
 * @returns {Record<string, unknown>}
 */
export function readMeddlewareConfig(root) {
  const file = join(root, 'package.json')
  /** @type {unknown} */
  let pkg
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`cannot read ${file}: ${err instanceof Error ? err.message : err}`)
  }
  if (!isObject(pkg)) throw new Error(`${file} is not a JSON object`)
  return object(pkg.meddleware, 'meddleware')
}

/**
 * @param {string} root
 * @returns {SiteConfig}
 */
export function readSiteConfig(root) {
  const site = object(readMeddlewareConfig(root).site, 'meddleware.site')
  const other = object(site.otherSite, 'meddleware.site.otherSite')
  const origin = text(other.origin, 'meddleware.site.otherSite.origin')
  if (!/^https?:\/\/[^/\s]+$/.test(origin)) throw new Error(`package.json "meddleware.site.otherSite.origin" must be an origin without a path (got "${origin}")`)
  return {
    id: text(site.id, 'meddleware.site.id'),
    outBase: relativePath(site.outBase, 'meddleware.site.outBase'),
    otherSite: {
      id: text(other.id, 'meddleware.site.otherSite.id'),
      origin,
      base: relativePath(other.base, 'meddleware.site.otherSite.base'),
    },
  }
}

/**
 * The on-chain id check's configuration. The generated tree it skips is `meddleware.site.outBase`, so the two bins cannot disagree.
 * @param {string} root
 * @returns {OnchainIdsConfig & { outBase: string }}
 */
export function readOnchainIdsConfig(root) {
  const meddleware = readMeddlewareConfig(root)
  const config = object(meddleware.onchainIds, 'meddleware.onchainIds')
  const outBase = relativePath(object(meddleware.site, 'meddleware.site').outBase, 'meddleware.site.outBase')

  const requiredIn = object(config.required, 'meddleware.onchainIds.required')
  if (Object.keys(requiredIn).length === 0) throw new Error('package.json "meddleware.onchainIds.required" must name at least one page')
  /** @type {Record<string, string[]>} */
  const required = {}
  for (const [page, names] of Object.entries(requiredIn)) {
    const path = `meddleware.onchainIds.required["${page}"]`
    if (!Array.isArray(names) || names.length === 0) throw new Error(`package.json "${path}" must be a non-empty array of deployment names`)
    required[page] = names.map((name, i) => text(name, `${path}[${i}]`))
  }

  /** @type {Map<string, string>} */
  const otherIds = new Map()
  const otherIn = config.otherIds ?? []
  if (!Array.isArray(otherIn)) throw new Error('package.json "meddleware.onchainIds.otherIds" must be an array')
  otherIn.forEach((entry, i) => {
    const path = `meddleware.onchainIds.otherIds[${i}]`
    const item = object(entry, path)
    const id = text(item.id, `${path}.id`)
    if (!/^0x[0-9a-f]{64}$/.test(id)) throw new Error(`package.json "${path}.id" must be 0x and 64 lower-case hex digits (got "${id}")`)
    otherIds.set(id, text(item.reason, `${path}.reason`))
  })

  const skipIn = config.skipDirs ?? []
  if (!Array.isArray(skipIn)) throw new Error('package.json "meddleware.onchainIds.skipDirs" must be an array')
  const skipDirs = new Set(
    skipIn.map((name, i) => {
      const dir = text(name, `meddleware.onchainIds.skipDirs[${i}]`)
      if (dir.includes('/') || dir.includes('\\')) throw new Error(`package.json "meddleware.onchainIds.skipDirs[${i}]" is a directory name, not a path (got "${dir}")`)
      return dir
    }),
  )
  return { required, otherIds, skipDirs, outBase }
}
