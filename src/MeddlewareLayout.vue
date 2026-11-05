<script setup lang="ts">
// The default layout with the Meddleware footer: the copyright line and the contact of the organisation, in a `contentinfo` landmark.
import DefaultTheme, { useLayout } from 'vitepress/theme'
import { AppFooter, CopyrightLine } from '@meddleware/ui'

const { Layout } = DefaultTheme
// VitePress's own footer hides itself on a page with a sidebar. This one stays (it carries the legal links), so on such a page it starts
// where the content does, as the content does (theme.css), instead of lying under the fixed sidebar (WCAG 2.4.11).
const { hasSidebar } = useLayout()
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <div class="mw-layout-footer" :class="{ 'has-sidebar': hasSidebar }">
        <AppFooter>
          <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
        </AppFooter>
      </div>
    </template>
  </Layout>
</template>
