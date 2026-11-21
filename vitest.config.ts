// Vitest settings: the tests exercise the config, the bins and the landmark edits, all of which run in plain Node (no DOM), so there is no jsdom.
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'] } })
