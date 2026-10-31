import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EDITS, landmarks } from '../src/landmarks.js'

// The edits are run against the VitePress that is installed, so an upgrade that changes the files fails here.
const theme = join(dirname(createRequire(import.meta.url).resolve('vitepress/package.json')), 'dist/client/theme-default/components')
const source = (file: string) => readFileSync(join(theme, file), 'utf8')

describe('landmark edits on the installed VitePress', () => {
  it('make the content of home, page and 404 pages a <main>, and leave doc pages to their own', () => {
    const out = EDITS['VPContent.vue']!(source('VPContent.vue'))
    expect(out).toContain('<component\n    :is="landmark"\n    class="VPContent"')
    expect(out).toMatch(/<\/component>\s*<\/template>/)
    expect(out).toContain("page.value.isNotFound || ['page', 'home'].includes(frontmatter.value.layout) ? 'main' : 'div'")
    expect(out).not.toMatch(/<div\s+class="VPContent"/)
  })

  it('turn the mid-page doc footer into a div, so it is not a second contentinfo', () => {
    const out = EDITS['VPDocFooter.vue']!(source('VPDocFooter.vue'))
    expect(out).toContain('<div v-if="showFooter" class="VPDocFooter">')
    expect(out).not.toContain('<footer')
    expect(out).toMatch(/<\/div>\s*<\/template>/)
  })

  it('fail loudly, naming the file, when VitePress no longer has the text', () => {
    expect(() => EDITS['VPDocFooter.vue']!('<template><footer class="other"></footer></template>')).toThrow(/cannot patch VPDocFooter\.vue/)
    expect(() => EDITS['VPContent.vue']!('<template></template>')).toThrow(/cannot patch VPContent\.vue/)
  })
})

describe('the plugin', () => {
  const plugin = landmarks() as unknown as { enforce: string; transform(code: string, id: string): { code: string } | null }

  it('runs before the Vue compiler and edits only the two components', () => {
    expect(plugin.enforce).toBe('pre')
    const id = join(theme, 'VPDocFooter.vue')
    expect(plugin.transform(source('VPDocFooter.vue'), id)?.code).toContain('<div v-if="showFooter"')
    expect(plugin.transform(source('VPHome.vue'), join(theme, 'VPHome.vue'))).toBeNull()
    expect(plugin.transform('x', '/elsewhere/VPDocFooter.vue')).toBeNull()
  })

  it('leaves the sub-requests of a component (?vue&type=style…) alone', () => {
    expect(plugin.transform('x', `${join(theme, 'VPContent.vue')}?vue&type=style`)).toBeNull()
  })
})
