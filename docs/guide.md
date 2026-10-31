# Guide

A paragraph with a [link](/guide), some `inline code`, a [link in `code`](/guide) and **strong** and *emphasised* text.

## Elements {#elements}

### Lists

- First item with a [link](/guide)
- Second item
  1. Nested one
  2. Nested two

### Table

| Name | Role | Notes |
| --- | --- | --- |
| accent | brand | Links and the primary action |
| primary | success | Positive states |
| danger | error | Errors and destructive actions |

### Code

```ts
import { baseConfig } from '@meddleware/vitepress-theme/config'

// A comment: the high-contrast themes keep this readable.
export default baseConfig({ configUrl: import.meta.url, title: 'Docs', description: 'Docs' })
```

```sh
npm install @meddleware/vitepress-theme
```

### Custom blocks

::: info
An info block.
:::

::: tip
A tip block with a [link](/guide).
:::

::: warning
A warning block.
:::

::: danger
A danger block.
:::

::: details A details block
Hidden until opened.
:::

### Badges

A heading with a badge <Badge type="info" text="info" /> <Badge type="tip" text="tip" /> <Badge type="warning" text="warning" /> <Badge type="danger" text="danger" />

> A blockquote, with enough text to see its rule and its colour against the page.
