#!/usr/bin/env node
// @ts-check
// Fails the build when the built site contains an audit page. `docs/audit/` is an internal review
// kept next to the site source; `srcExclude: ['audit/**']` in the VitePress config keeps it out of
// dist/, and this check makes a regression (a changed srcExclude, a moved file) impossible to miss.
//
// Usage: mw-check-dist-no-audit [distDir]   (default: dist, under the current directory)
import { readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { isEntryPoint } from '../entry-point.js'

/**
 * Returns the paths (relative to `dist`) of anything that looks like an audit page.
 * @param {string} dist
 * @returns {string[]}
 */
export function findAuditPages(dist) {
  /** @type {string[]} */
  const found = []
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      const rel = relative(dist, p).split(sep).join('/')
      // A name with `audit` as a whole word (audit, security-audit, audit.report), not as part of another word ("auditing-your-code" is fine).
      // An audit directory is reported once and not walked into.
      if (/(^|[-_.])audit([-_.]|$)/i.test(entry.name)) found.push(rel)
      else if (entry.isDirectory()) walk(p)
    }
  }
  walk(dist)
  return found
}

// Run as a command: exit 0 when the built site is clean, 1 when audit material is in it or the directory cannot be read.
if (isEntryPoint(import.meta.url)) {
  const dist = resolve(process.argv[2] ?? 'dist')
  let found
  try {
    found = findAuditPages(dist)
  } catch (err) {
    console.error(`dist check: cannot read ${dist}: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
  if (found.length) {
    console.error('dist check: audit material in the built site:')
    for (const f of found) console.error(`  ${f}`)
    process.exit(1)
  }
  console.log('dist check: no audit page in the built site.')
}
