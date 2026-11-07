#!/usr/bin/env node
// @ts-check
// Writes dist/llms-full.txt (llmstxt.org): every published page's Markdown source in one file, so agents
// and IDE tools can read the whole site in one request. Runs after `vitepress build`, from the site's root; audit pages
// (srcExclude) and generated API pages are left out, exactly as the site leaves out the audit.
//
// Usage: mw-gen-llms-full <site-url> "<site title>"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { isEntryPoint } from '../entry-point.js'

/**
 * @param {string} rel path under `docs/`, forward slashes
 * @returns {boolean}
 */
const skip = (rel) => rel.startsWith('audit/') || rel.startsWith('.vitepress/') || rel.startsWith('public/') || /(^|\/)(api|wire-api)\//.test(rel)

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : name.endsWith('.md') ? [path] : []
  })
}

/**
 * Writes `<root>/dist/llms-full.txt` from the Markdown under `<root>/docs`.
 * @param {object} options
 * @param {string} options.siteUrl
 * @param {string} options.title
 * @param {string} [options.root] the site's root (default: the current directory)
 * @returns {{ pages: string[], file: string }} the page paths included (under `docs/`) and the file written
 */
export function generateLlmsFull({ siteUrl, title, root = process.cwd() }) {
  const docs = join(root, 'docs')
  const dist = join(root, 'dist')
  const pages = walk(docs)
    .map((p) => relative(docs, p).split(sep).join('/'))
    .filter((rel) => !skip(rel))
    .sort((a, b) => (a === 'index.md' ? -1 : b === 'index.md' ? 1 : a.localeCompare(b)))

  const url = (/** @type {string} */ rel) => siteUrl.replace(/\/$/, '') + '/' + rel.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  const body = (/** @type {string} */ rel) => readFileSync(join(docs, rel), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim()

  const out = [`# ${title}`, '', `> The full text of ${siteUrl}, one section per page.`, '']
  for (const rel of pages) out.push(`---`, '', `Source: ${url(rel)}`, '', body(rel), '')
  if (!existsSync(dist)) throw new Error('dist/ is missing: run vitepress build first')
  const file = join(dist, 'llms-full.txt')
  writeFileSync(file, out.join('\n'))
  return { pages, file }
}

if (isEntryPoint(import.meta.url)) {
  const [siteUrl, title] = process.argv.slice(2)
  if (!siteUrl || !title) {
    console.error('usage: mw-gen-llms-full <site-url> "<site title>"')
    process.exit(2)
  }
  try {
    const { pages } = generateLlmsFull({ siteUrl, title })
    console.log(`llms-full.txt: ${pages.length} pages`)
  } catch (err) {
    console.error(`mw-gen-llms-full: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}
