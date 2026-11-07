#!/usr/bin/env node
// @ts-check
// Build-time import of the CANONICAL on-chain docs that live inside each Sui Move package repo
// (`<package>/docs/onchain/*.md` + `manifest.json`). The site is a consumer of that content, never
// its source of truth: pages are copied fresh on every build into a git-ignored subtree, and the
// sidebar is generated from the packages' manifests.
//
// Run from the site's root. The site is configured in its package.json (see the README, "Site scripts"):
//   "meddleware": { "site": { "id": "docs", "outBase": "blockchain/sui/onchain",
//                             "otherSite": { "id": "dev", "origin": "https://meddleware.dev", "base": "sui/onchain" } } }
//
// Resolution (no network, no hidden runtime dependency — everything comes from explicit inputs):
//  - default: the installed npm package (`node_modules/<pkg>`, resolved via `<pkg>/package.json` from the site's root);
//  - override: ONCHAIN_DOCS_ROOT=<dir> reads `<dir>/<repoDir>/docs/onchain` instead (e.g. `..` to
//    preview unpublished changes from sibling checkouts in the workspace).
//
// Link handling: a link to another manifest page stays relative when that page is published on this
// site, and becomes an absolute URL on the other site otherwise; any other relative link (a repo
// file such as SECURITY.md) becomes a GitHub URL. So imported pages never produce dead links.
//
// Fails soft: a missing package or manifest writes a placeholder page and a warning; the script then
// exits 0 so the site still builds. A missing or malformed site configuration is not soft: it exits 1.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'
import { isEntryPoint } from '../entry-point.js'
import { readSiteConfig } from '../site-config.js'

/**
 * @typedef {import('../site-config.js').SiteConfig} SiteConfig
 * @typedef {{ pkg: string, repoDir: string, slug: string, title: string }} PackageEntry
 * @typedef {{ file: string, title: string, sites: string[] }} ManifestPage
 * @typedef {{ package: string, slug: string, title: string, repository: string, pages: ManifestPage[] }} Manifest
 * @typedef {{ text: string, collapsed: boolean, items: { text: string, link: string }[] }} SidebarGroup
 */

// Sui/Move packages whose on-chain docs are canonical in their own repo. `slug`/`title` are only
// fallbacks for the placeholder when the package (and so its manifest) is unavailable.
/** @type {PackageEntry[]} */
export const PACKAGES = [
  { pkg: '@meddleware/access-gate-sui', repoDir: 'access-gate-sui', slug: 'access-gate', title: 'Access Gate' },
  { pkg: '@meddleware/sealed-storage-sui', repoDir: 'sealed-storage-sui', slug: 'sealed-storage', title: 'Sealed Storage policies' },
  { pkg: '@meddleware/token-issuance-template-sui', repoDir: 'token-issuance-template-sui', slug: 'token-issuance', title: 'Token Issuance' },
]

// Standard page names every manifest uses; placeholders are written for all of them so hand-written
// pages on either site can link to them without risking a dead link in a build without the package.
const STANDARD_PAGES = ['overview', 'user-guide', 'dev-guide', 'api-reference']

/** @param {string} file */
const stem = (file) => file.replace(/\.md$/, '')

/**
 * Rewrites relative Markdown links: `[text](target)` / `[text](target#anchor)`.
 * @param {string} md
 * @param {Manifest} manifest
 * @param {SiteConfig} site
 * @returns {string}
 */
export function rewriteLinks(md, manifest, site) {
  const pages = new Map(manifest.pages.map((p) => [p.file, p]))
  return md.replace(/\]\((?!https?:|mailto:|#|\/)([^)\s#]+)(#[^)\s]*)?\)/g, (_all, target, anchor = '') => {
    const normal = posix.normalize(target)
    const page = pages.get(posix.basename(normal))
    if (page && !normal.startsWith('..')) {
      if (page.sites.includes(site.id)) return `](./${stem(page.file)}${anchor})`
      return `](${site.otherSite.origin}/${site.otherSite.base}/${manifest.slug}/${stem(page.file)}${anchor})`
    }
    // Any other relative link points at a file in the package repo (relative to docs/onchain/).
    const repoPath = posix.normalize(posix.join('docs/onchain', normal))
    return `](${manifest.repository}/blob/main/${repoPath}${anchor})`
  })
}

/**
 * @param {Manifest} manifest
 * @param {ManifestPage} page
 * @returns {string}
 */
function sourceFooter(manifest, page) {
  return (
    `\n\n---\n\n<small>Canonical source: [\`${manifest.package}\` → \`docs/onchain/${page.file}\`]` +
    `(${manifest.repository}/blob/main/docs/onchain/${page.file}) — maintained with the Move package; ` +
    `edit it there, not on this site.</small>\n`
  )
}

/**
 * @typedef {object} GenerateOptions
 * @property {string} [root] the site's root (default: the current directory)
 * @property {SiteConfig} [site] the site (default: read from `<root>/package.json`)
 * @property {string | undefined} [docsRootOverride] ONCHAIN_DOCS_ROOT (default: the environment's)
 * @property {PackageEntry[]} [packages]
 */

/**
 * Copies the packages' on-chain docs into `<root>/docs/<outBase>` and writes `<root>/docs/.vitepress/generated/onchain-sidebar.json`.
 * @param {GenerateOptions} [options]
 * @returns {{ sidebar: SidebarGroup[], failures: number }}
 */
export function generateOnchain({ root = process.cwd(), site = readSiteConfig(root), docsRootOverride = process.env.ONCHAIN_DOCS_ROOT, packages = PACKAGES } = {}) {
  const require = createRequire(join(root, 'package.json'))
  const docsRoot = join(root, 'docs')
  const outRoot = join(docsRoot, site.outBase)
  const sidebarFile = join(docsRoot, '.vitepress', 'generated', 'onchain-sidebar.json')

  /**
   * @param {PackageEntry} entry
   * @returns {string | null}
   */
  function sourceDir({ pkg, repoDir }) {
    if (docsRootOverride) return join(resolve(root, docsRootOverride), repoDir, 'docs', 'onchain')
    try {
      return join(dirname(require.resolve(`${pkg}/package.json`)), 'docs', 'onchain')
    } catch {
      return null
    }
  }

  /**
   * @param {PackageEntry} entry
   * @param {string} why
   * @returns {SidebarGroup}
   */
  function placeholder(entry, why) {
    const dir = join(outRoot, entry.slug)
    mkdirSync(dir, { recursive: true })
    for (const name of STANDARD_PAGES) {
      writeFileSync(
        join(dir, `${name}.md`),
        `# ${entry.title} — on-chain docs\n\n::: warning On-chain documentation not available in this build\n` +
          `\`${entry.pkg}\` could not be loaded (${why}). Install it (or set \`ONCHAIN_DOCS_ROOT\`) and ` +
          `rebuild.\n:::\n`,
      )
    }
    return { text: `${entry.title} (on-chain)`, collapsed: true, items: [{ text: 'On-chain overview', link: `/${site.outBase}/${entry.slug}/overview` }] }
  }

  rmSync(outRoot, { recursive: true, force: true })
  mkdirSync(outRoot, { recursive: true })

  /** @type {SidebarGroup[]} */
  const sidebar = []
  let failures = 0
  for (const entry of packages) {
    const dir = sourceDir(entry)
    const manifestPath = dir && join(dir, 'manifest.json')
    if (!dir || !manifestPath || !existsSync(manifestPath)) {
      failures++
      const why = dir ? 'no docs/onchain/manifest.json in the resolved package' : 'package not installed'
      console.warn(`[gen:onchain] ${entry.pkg}: ${why} — writing placeholder.`)
      sidebar.push(placeholder(entry, why))
      continue
    }
    /** @type {Manifest} */
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const pages = manifest.pages.filter((p) => p.sites.includes(site.id))
    const outDir = join(outRoot, manifest.slug)
    mkdirSync(outDir, { recursive: true })
    /** @type {SidebarGroup['items']} */
    const items = []
    for (const page of pages) {
      const src = join(dir, page.file)
      if (!existsSync(src)) {
        failures++
        console.warn(`[gen:onchain] ${entry.pkg}: missing ${page.file} — skipped.`)
        continue
      }
      const md = rewriteLinks(readFileSync(src, 'utf8'), manifest, site) + sourceFooter(manifest, page)
      writeFileSync(join(outDir, page.file), md)
      items.push({ text: page.title, link: `/${site.outBase}/${manifest.slug}/${stem(page.file)}` })
    }
    if (!items.length) {
      sidebar.push(placeholder(entry, 'manifest lists no pages for this site'))
      continue
    }
    sidebar.push({ text: `${manifest.title} (on-chain)`, collapsed: true, items })
    console.log(`[gen:onchain] ${manifest.package}: ${items.length} page(s) → docs/${site.outBase}/${manifest.slug}`)
  }

  mkdirSync(dirname(sidebarFile), { recursive: true })
  writeFileSync(sidebarFile, JSON.stringify(sidebar, null, 2) + '\n')
  if (failures) console.warn(`[gen:onchain] completed with ${failures} placeholder(s)/gap(s); site still builds.`)
  return { sidebar, failures }
}

if (isEntryPoint(import.meta.url)) {
  let site
  try {
    site = readSiteConfig(process.cwd())
  } catch (err) {
    console.error(`mw-gen-onchain: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
  generateOnchain({ site })
}
