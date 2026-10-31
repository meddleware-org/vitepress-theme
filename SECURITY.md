# Security Policy

## Scope

This policy covers `@meddleware/vitepress-theme`: the VitePress theme and site config for MeddleWare documentation sites. It runs at
build time (the config, and a Vite plugin that edits two components of VitePress's default theme as they compile) and in the browser
(the theme's components and CSS). It makes no network requests of its own and handles no user data.

It does not cover a consuming site, VitePress, or the content a site publishes.

## What it guarantees

The theme maps VitePress's colours onto the design tokens and fixes two landmark problems in the default theme; its accessibility
checks are automated (axe, WCAG 2.2 AA and AAA) over a fixture site and are not a substitute for testing a real site with assistive
technology. The landmark edits are exact string replacements that fail the build, naming the file, if VitePress changes the text they
rely on.

## Supply chain

Releases are published from this repository's `npm-publish.yml` with npm trusted publishing (OIDC and provenance); tokens are not
used. The Vite plugin runs in a consumer's build, so a compromised release could run code there: report anything that suggests
tampering.

## Supported versions

Only the latest published npm version receives fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Use GitHub's private vulnerability reporting for this
repository, or email dev@meddleware.co.uk.
