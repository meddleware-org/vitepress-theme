<script setup lang="ts">
// The default layout with the Meddleware footer: the copyright line and the contact of the organisation, in a `contentinfo` landmark.
import DefaultTheme from 'vitepress/theme'
import { AppFooter, CopyrightLine } from '@meddleware/ui'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AppFooter>
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </AppFooter>
    </template>
  </Layout>
</template>
