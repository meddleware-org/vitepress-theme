// @ts-check
// Landmark fixes for the VitePress default theme, applied to its source while Vite compiles it.
//
// Two of the default theme's pages fail WCAG's landmark rules, and the theme gives no slot to fix them from outside:
//  - The home, `page` layout and 404 pages have no `<main>`: their content sits in a `div#VPContent`. The doc layout has its own
//    `<main>`, so only the other layouts get one (two nested mains would be invalid).
//  - The doc footer (edit link, last updated, previous/next) is a `<footer>` in the middle of the page, so it is a second `contentinfo`
//    landmark next to the site footer. It is a plain `div`; the previous/next links are already a named `nav`.
//
// Each edit is an exact string replacement that throws when the text is not found: a VitePress upgrade that changes these files
// fails the build, with the name of the file, instead of silently losing the fix. `tests/landmarks.test.ts` runs the edits against the
// installed VitePress.

/**
 * @param {string} code
 * @param {string} from
 * @param {string} to
 * @param {string} file For the error message.
 */
function replaceOnce(code, from, to, file) {
  const first = code.indexOf(from)
  if (first === -1 || code.indexOf(from, first + 1) !== -1) {
    throw new Error(`@meddleware/vitepress-theme: cannot patch ${file}: expected exactly one occurrence of ${JSON.stringify(from)} (VitePress changed? update src/landmarks.js).`)
  }
  return code.replace(from, to)
}

/** @type {Record<string, (code: string) => string>} */
export const EDITS = {
  'VPContent.vue': (code) => {
    let out = replaceOnce(code, 'const { isHome, hasSidebar } = useLayout();', "const { isHome, hasSidebar } = useLayout();\nconst landmark = page.value.isNotFound || ['page', 'home'].includes(frontmatter.value.layout) ? 'main' : 'div';", 'VPContent.vue')
    out = replaceOnce(out, '<div\n    class="VPContent"', '<component\n    :is="landmark"\n    class="VPContent"', 'VPContent.vue')
    return replaceOnce(out, '<component v-else :is="frontmatter.layout || \'doc\'" />\n  </div>\n</template>', '<component v-else :is="frontmatter.layout || \'doc\'" />\n  </component>\n</template>', 'VPContent.vue')
  },
  'VPDocFooter.vue': (code) => {
    const out = replaceOnce(code, '<footer v-if="showFooter" class="VPDocFooter">', '<div v-if="showFooter" class="VPDocFooter">', 'VPDocFooter.vue')
    return replaceOnce(out, '</footer>\n</template>', '</div>\n</template>', 'VPDocFooter.vue')
  },
}

/**
 * A Vite plugin that applies {@link EDITS} to the default theme's components.
 * @returns {import('vite').Plugin}
 */
export function landmarks() {
  return {
    name: 'meddleware:vitepress-landmarks',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('?')) return null
      const normalised = id.replaceAll('\\', '/')
      if (!normalised.includes('/theme-default/components/')) return null
      const edit = EDITS[normalised.slice(normalised.lastIndexOf('/') + 1)]
      return edit ? { code: edit(code), map: null } : null
    },
  }
}
