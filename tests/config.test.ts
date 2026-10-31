import { describe, expect, it } from 'vitest'
import tokens from '@meddleware/design-tokens/tokens.json' with { type: 'json' }
import { baseConfig } from '../src/config.js'

const configUrl = 'file:///site/docs/.vitepress/config.ts'
const base = { configUrl, title: 'T', description: 'D' }

describe('baseConfig', () => {
  it('derives the source directory and the output directory from the config file', () => {
    const c = baseConfig(base)
    expect(c.srcDir).toBe('/site/docs/')
    expect(c.outDir).toBe('/site/dist')
  })

  it('carries the estate defaults', () => {
    const c = baseConfig(base)
    expect(c).toMatchObject({ title: 'T', description: 'D', lang: 'en-GB', cleanUrls: true, lastUpdated: false, appearance: 'dark', srcExclude: ['audit/**'] })
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

  it('always has the favicon, and appends the site’s own head entries', () => {
    const c = baseConfig({ ...base, head: [['meta', { name: 'x', content: 'y' }]] })
    expect(c.head?.[0]).toEqual(['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }])
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
