# Tailwind CSS v4 (shared)

This repo includes a shared Tailwind package:

- `packages/ui/styles.css` (entrypoint: `@import "tailwindcss";`)
- `packages/ui/tailwind.config.ts` (optional shared preset; many v4 setups can be CSS-only)

## Tailwind v4 setup notes

Tailwind v4 has a few important setup changes from v3:

- Use `@import "tailwindcss";` in your CSS entrypoint (instead of `@tailwind base/components/utilities`).
- If you use PostCSS, configure the dedicated PostCSS plugin (`@tailwindcss/postcss`) — not `tailwindcss`.
- You typically **do not** need `autoprefixer` or `postcss-import` anymore (v4 includes prefixing + import support).

Official docs:

- https://tailwindcss.com/docs/installation/using-postcss
- https://tailwindcss.com/docs/upgrade-guide

## Best practices (Tailwind v4 + Cloudflare Workers)

- Build Tailwind at **compile time** (Vite/framework build); don’t run Tailwind in a Worker at runtime.
- Prefer `@tailwindcss/vite` for Vite-based Cloudflare UIs; use PostCSS only when your framework requires it.
- Keep shared design tokens in `packages/ui/styles.css` using `@theme`, and consume them via `@import "@cloudflare-northstar/ui/styles.css";`.
- In monorepos, make scanning explicit with `@source` in your app CSS entrypoint for any shared packages you use.
- Avoid v3-era patterns: `@tailwind base/components/utilities`, `tailwindcss` as a PostCSS plugin, `autoprefixer`, and `postcss-import`.

## Use in a frontend app

Install workspace deps and import the shared stylesheet from your app’s global CSS:

```css
@import "@cloudflare-northstar/ui/styles.css";
```

## Recommended (Vite): `@tailwindcss/vite`

For Vite-based frameworks (SolidStart, SvelteKit, QwikCity, etc.), prefer the first-party Vite plugin
and skip PostCSS entirely:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({ plugins: [tailwindcss()] });
```

`styles.css` includes an `@theme` block with a few starter tokens. Example usage:

- `bg-background text-foreground`
- `bg-brand text-brand-foreground`
- `animate-fade-in`

If you need plugins, add them in your app CSS (and install them in the consuming app):

```css
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
```

## PostCSS config (example)

If your framework expects a PostCSS config, use the v4 plugin:

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## Monorepo source scanning

When a frontend needs Tailwind to scan shared packages, add `@source` directives in your CSS
entrypoint (Tailwind v4 feature).

Docs:

- https://tailwindcss.com/docs/detecting-classes-in-source-files

## Two supported patterns

1. **Framework-managed Tailwind (recommended)**: each framework app owns the Tailwind build and just imports
   `@cloudflare-northstar/ui/styles.css` for shared tokens/components.
2. **Workers Assets + Tailwind build**: build your CSS into `apps/web/public/` (or your chosen assets directory)
   and serve it via the `ASSETS` binding on the public Worker.
