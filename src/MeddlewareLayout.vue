<script setup lang="ts">
// The default layout with the Meddleware footer: the copyright line and the contact of the organisation, in a `contentinfo` landmark.
import { computed } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme, { useLayout } from 'vitepress/theme-without-fonts'
import { AppFooter, BrandMark, CopyrightLine } from '@meddleware/ui'

const { Layout } = DefaultTheme
// VitePress's own footer hides itself on a page with a sidebar. This one stays (it carries the legal links), so on such a page it starts
// where the content does, as the content does (theme.css), instead of lying under the fixed sidebar (WCAG 2.4.11).
const { hasSidebar } = useLayout()
// Links a site adds to the footer (`themeConfig.footerLinks: [{ text, link }]`), e.g. the treasury: things a reader may want that are
// not part of the site's own navigation.
const { theme } = useData()
const footerLinks = computed<{ text: string; link: string }[]>(() => (theme.value as { footerLinks?: { text: string; link: string }[] }).footerLinks ?? [])
</script>

<template>
  <Layout>
    <template #nav-bar-title-before><BrandMark class="mw-layout-mark" /></template>
    <template #layout-bottom>
      <div class="mw-layout-footer" :class="{ 'has-sidebar': hasSidebar }">
        <AppFooter>
          <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
          <template v-if="footerLinks.length" #end>
            <a v-for="l in footerLinks" :key="l.link" :href="l.link">{{ l.text }}</a>
          </template>
        </AppFooter>
      </div>
    </template>
  </Layout>
</template>
