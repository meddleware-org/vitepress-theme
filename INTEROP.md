# Open standards and interoperability: vitepress-theme

The VitePress theme and base config for the three sites.

This page lists what the project speaks today, what is planned, what was considered and does not apply, where someone else can extend it, and what proves each claim. The platform-wide list is [Standards we use](https://meddleware.dev/platform/standards). A row appears there in the same change that turns a standard on.

## Spoken today

- The shared layout, footer links and the head defaults
- WCAG 2.2 AA through @meddleware/ui and the design tokens

## Planned

- Feed-autodiscovery and Open Graph head tags from page front matter

## Considered, not applicable

- none

## Extension points

- baseConfig({ footerLinks })

## What proves it

- its unit tests
- the sites' e2e

_Maintained centrally with the platform's interoperability map; changes go through it so every repository says the same thing._
