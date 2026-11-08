// @ts-check
// The company mark's favicon set for a VitePress site: the files come from `@meddleware/ui/brand/*` (the Kopimi "K", see that package's
// src/brand/README.md), so a site keeps no icon of its own. Served in development by a small middleware, copied into the output when the build
// ends, together with a web manifest; the `<link>` tags are in `baseConfig`'s head.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import tokens from '@meddleware/design-tokens/tokens.json' with { type: 'json' }

export const BRAND_FILES = /** @type {const} */ ({
  'favicon.svg': 'image/svg+xml',
  'favicon.ico': 'image/x-icon',
  'apple-touch-icon.png': 'image/png',
  'icon-192.png': 'image/png',
  'icon-512.png': 'image/png',
})

/** @param {string} file */
const brandPath = (file) => createRequire(join(process.cwd(), 'noop.js')).resolve(`@meddleware/ui/brand/${file}`)

/** @param {string} name */
export function manifest(name) {
  return JSON.stringify(
    {
      name,
      short_name: name,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
      theme_color: tokens.semantic.dark.bg,
      background_color: tokens.semantic.dark.bg,
      display: 'browser',
    },
    null,
    2,
  )
}

/** The `<head>` entries of the set. */
export const brandHead = /** @type {import('vitepress').HeadConfig[]} */ ([
  ['link', { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' }],
  ['link', { rel: 'icon', sizes: '48x48', href: '/favicon.ico' }],
  ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ['link', { rel: 'manifest', href: '/site.webmanifest' }],
])

/** Copy the files and the manifest into the built site. @param {string} outDir @param {string} name */
export function copyBrand(outDir, name) {
  mkdirSync(outDir, { recursive: true })
  for (const file of Object.keys(BRAND_FILES)) copyFileSync(brandPath(file), join(outDir, file))
  writeFileSync(join(outDir, 'site.webmanifest'), manifest(name))
}

/** Development only: serve the set. @param {string} name @returns {import('vite').Plugin} */
export function brandDev(name) {
  return {
    name: 'meddleware:brand-icons',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = (req.url ?? '').split('?')[0]?.slice(1) ?? ''
        if (file in BRAND_FILES) {
          res.setHeader('content-type', BRAND_FILES[/** @type {keyof typeof BRAND_FILES} */ (file)])
          res.end(readFileSync(brandPath(file)))
        } else if (file === 'site.webmanifest') {
          res.setHeader('content-type', 'application/manifest+json')
          res.end(manifest(name))
        } else next()
      })
    },
  }
}
