// @ts-check
// The self-run guard the site-script bins share: "is this module the script Node was started with?". A bin is started through a symlink in
// `node_modules/.bin`, so the check compares real paths; tests/site-bins.test.ts runs every bin through such a symlink.
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Whether the module at `moduleUrl` is the script Node was started with. An installed bin runs through a symlink in
 * `node_modules/.bin`, so `process.argv[1]` is that link: compare real paths, never the raw argument.
 * @param {string} moduleUrl `import.meta.url` of the module asking
 * @param {string | undefined} [entry] the script Node was started with (default `process.argv[1]`)
 * @returns {boolean}
 */
export function isEntryPoint(moduleUrl, entry = process.argv[1]) {
  // No entry (an eval, a REPL) is never the entry point; otherwise both sides are resolved to real paths before they are compared.
  return Boolean(entry) && fileURLToPath(moduleUrl) === realpathSync(/** @type {string} */ (entry))
}
