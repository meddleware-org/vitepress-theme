# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-11-01

### Changed

- The fixture's accessibility gate is the shared sweep (`defineA11ySuite`): besides axe at AA and AAA in every colour mode × season it now
  checks reflow at 320 px, 200% text, forced colours, reduced motion and the keyboard (focus visible and not hidden behind the fixed navigation bar).
- `SECURITY.md` is part of the published files.
- **The footer no longer lies under the sidebar.** VitePress's own footer hides on a page with a sidebar; ours stays (it holds the legal links), and the fixed full-height sidebar covered its left edge from 60rem, so the © link could not be seen when focused (WCAG 2.4.11). On such a page the footer now starts where the content does, with VitePress's own offsets. Three width tests in every browser hold it.
- VitePress 2.0.0-alpha.21 (peer and development pin; the landmark edits and the fixture sweep pass unchanged).

## [0.0.1] - 2026-10-31

### Added

- First release. The VitePress default theme mapped onto `@meddleware/design-tokens` (colour mode, seasons, WCAG AAA contrast), a layout
  with the Meddleware footer, the `baseConfig` site config, and landmark fixes for the default theme, extracted from the byte-identical
  copies in docs-site and dev-site.
