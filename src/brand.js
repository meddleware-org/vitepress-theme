// @ts-check
// The company mark's favicon set for a VitePress site: the files come from `@meddleware/ui/brand/*` (the Kopimi "K", see that package's
// src/brand/README.md), so a site keeps no icon of its own. Served in development by a small middleware, copied into the output when the build
// ends, together with a web manifest; the `<link>` tags are in `baseConfig`'s head.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import tokens from '@meddleware/design-tokens/tokens.json' with { type: 'json' }

/** The five files of the set, with the media type each is served as in development. */
export const BRAND_FILES = /** @type {const} */ ({
  'favicon.svg': 'image/svg+xml',
  'favicon.ico': 'image/x-icon',
  'apple-touch-icon.png': 'image/png',
  'icon-192.png': 'image/png',
  'icon-512.png': 'image/png',
})

/**
 * Where a brand file is installed: `@meddleware/ui` is resolved from the site's own directory (it is the site's dependency, not this package's,
 * so resolving from here would fail under pnpm or with a different version).
 * @param {string} file - one of the {@link BRAND_FILES} names
 * @returns {string} the absolute path
 */
const brandPath = (file) => createRequire(join(process.cwd(), 'noop.js')).resolve(`@meddleware/ui/brand/${file}`)

/**
 * The web manifest: the site's name, the three icons and the dark page colour from the design tokens (so the browser chrome matches the page).
 * @param {string} name - the site's title
 * @returns {string} the manifest as JSON text
 */
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
      // `browser`, not `standalone`: a documentation site is not an installable app; the manifest only supplies the icons and colours.
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

/**
 * Copy the files and the manifest into the built site, at its root, where the `<link>` tags point.
 * @param {string} outDir - the build output directory
 * @param {string} name - the site's title, for the manifest
 */
export function copyBrand(outDir, name) {
  mkdirSync(outDir, { recursive: true })
  for (const file of Object.keys(BRAND_FILES)) copyFileSync(brandPath(file), join(outDir, file))
  writeFileSync(join(outDir, 'site.webmanifest'), manifest(name))
}

/**
 * Development only: serve the set from the installed package, so the favicon and manifest work under `vitepress dev` without a copy step.
 * @param {string} name - the site's title, for the manifest
 * @returns {import('vite').Plugin} a Vite plugin that applies to the dev server only
 */
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
