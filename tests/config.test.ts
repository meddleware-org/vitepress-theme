/**
 * Tests for the shared site configuration (`src/config.js`): where the source and output directories are derived from, the estate defaults, the
 * browser-chrome colour from the tokens, the favicon set, the syntax themes, how extra options merge, and that the colour-mode choice is never stored
 * (STORAGE_LEDGER B12).
 */
import { describe, expect, it } from 'vitest'
import tokens from '@meddleware/design-tokens/tokens.json' with { type: 'json' }
import { baseConfig, unstoredAppearance } from '../src/config.js'

/** A site's config file, as a URL: the directories are derived from its location. */
const configUrl = 'file:///site/docs/.vitepress/config.ts'
/** The three options every site must give. */
const base = { configUrl, title: 'T', description: 'D' }

describe('baseConfig', () => {
  it('derives the source directory and the output directory from the config file', () => {
    const c = baseConfig(base)
    expect(c.srcDir).toBe('/site/docs/')
    expect(c.outDir).toBe('/site/dist')
  })

  it('carries the estate defaults', () => {
    const c = baseConfig(base)
    expect(c).toMatchObject({ title: 'T', description: 'D', lang: 'en-GB', cleanUrls: true, lastUpdated: false, appearance: { initialValue: 'dark', storageKey: null }, srcExclude: ['audit/**'] })
    expect(c.themeConfig).toMatchObject({ search: { provider: 'local' }, socialLinks: [{ icon: 'github', link: 'https://github.com/meddleware-org' }] })
  })

  it('takes the browser-chrome colour from the tokens: one dark colour for a dark-first site', () => {
    const colours = (c: ReturnType<typeof baseConfig>) => c.head?.filter((h) => h[0] === 'meta' && h[1]?.name === 'theme-color').map((h) => h[1])
    expect(colours(baseConfig(base))).toEqual([{ name: 'theme-color', content: tokens.semantic.dark.bg }])
    expect(colours(baseConfig({ ...base, appearance: true }))).toEqual([
      { name: 'theme-color', content: tokens.semantic.light.bg, media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: tokens.semantic.dark.bg, media: '(prefers-color-scheme: dark)' },
    ])
  })

  it('always has the favicon set, and appends the site’s own head entries', () => {
    const c = baseConfig({ ...base, head: [['meta', { name: 'x', content: 'y' }]] })
    expect(c.head?.slice(0, 4)).toEqual([
      ['link', { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' }],
      ['link', { rel: 'icon', sizes: '48x48', href: '/favicon.ico' }],
      ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ])
    expect(c.head?.at(-1)).toEqual(['meta', { name: 'x', content: 'y' }])
  })

  it('uses the high-contrast syntax themes, with comments as readable as the rest (the tokens’ muted text colour)', () => {
    const { light, dark } = baseConfig(base).markdown?.theme as unknown as Record<'light' | 'dark', { name: string; tokenColors: { scope?: string | string[]; settings: { foreground?: string } }[] }>
    const comment = (t: typeof light) => t.tokenColors.find((c) => [c.scope ?? []].flat().includes('comment'))?.settings.foreground
    expect(light.name).toBe('github-light-high-contrast-readable-comments')
    expect(dark.name).toBe('github-dark-high-contrast-readable-comments')
    expect(comment(light)).toBe(tokens.semantic.light.muted)
    expect(comment(dark)).toBe(tokens.semantic.dark.muted)
    // Every other token is untouched.
    expect(light.tokenColors.length).toBeGreaterThan(10)
  })

  it('has Vite process the design-system packages while rendering (they import CSS)', () => {
    const noExternal = baseConfig(base).vite?.ssr?.noExternal as RegExp[]
    expect(noExternal.some((r) => r.test('@meddleware/ui'))).toBe(true)
    expect(noExternal.some((r) => r.test('@meddleware/vitepress-theme'))).toBe(true)
    expect(noExternal.some((r) => r.test('vue'))).toBe(false)
  })

  it('merges extra options over the defaults, one level down for themeConfig, vite and markdown', () => {
    const c = baseConfig({
      ...base,
      nav: [{ text: 'A', link: '/a' }],
      extra: {
        ignoreDeadLinks: [/\/api\//],
        themeConfig: { search: { provider: 'local', options: { detailedView: true } } },
        vite: { ssr: { noExternal: ['some-package'] } },
        markdown: { lineNumbers: true },
      },
    })
    expect(c.ignoreDeadLinks).toEqual([/\/api\//])
    expect(c.themeConfig).toMatchObject({ nav: [{ text: 'A', link: '/a' }], socialLinks: [{ icon: 'github' }], search: { options: { detailedView: true } } })
    expect(c.vite?.ssr?.noExternal).toContain('some-package')
    expect((c.vite?.ssr?.noExternal as unknown[]).some((r) => r instanceof RegExp)).toBe(true)
    expect(c.markdown).toMatchObject({ lineNumbers: true, theme: { light: { name: 'github-light-high-contrast-readable-comments' } } })
  })
})

// VitePress's switch stores its value on the first page load unless told not to; the config turns that off so nothing is stored before an action.
describe('unstoredAppearance (STORAGE_LEDGER B12)', () => {
  it('keeps the first-visit mode and never stores the choice', () => {
    expect(unstoredAppearance('dark')).toEqual({ initialValue: 'dark', storageKey: null })
    expect(unstoredAppearance(true)).toEqual({ initialValue: 'auto', storageKey: null })
  })

  it('leaves the modes that store nothing alone', () => {
    expect(unstoredAppearance(false)).toBe(false)
    expect(unstoredAppearance('force-dark')).toBe('force-dark')
    expect(unstoredAppearance('force-auto')).toBe('force-auto')
  })
})

// `footerLinks` is not a default-theme key: the config passes it through to the theme config so MeddlewareLayout can render it.
describe('footerLinks', () => {
  it('reaches the theme config for the layout, and defaults to none', () => {
    const links = [{ text: 'Treasury', link: 'https://treasury.meddleware.co.uk' }]
    expect((baseConfig({ ...base, footerLinks: links }).themeConfig as { footerLinks: unknown }).footerLinks).toEqual(links)
    expect((baseConfig(base).themeConfig as { footerLinks: unknown }).footerLinks).toEqual([])
  })
})
