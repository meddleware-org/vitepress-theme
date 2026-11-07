// @ts-check
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
  return Boolean(entry) && fileURLToPath(moduleUrl) === realpathSync(/** @type {string} */ (entry))
}
