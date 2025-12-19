# Tailwind CSS v4 (shared, CSS-first)

Tailwind v4 is designed for **CSS-first configuration**. This repo ships a shared UI/theme package you can import from any framework app:

- `packages/ui/theme.css` — shared `@theme` tokens (recommended)
- `packages/ui/styles.css` — convenience entrypoint (`@import "tailwindcss";` + `theme.css`)
- `packages/ui/monorepo.css` — monorepo entrypoint (disables auto-detection and declares `@source` paths)
- `packages/ui/tailwind.config.ts` — optional legacy config placeholder (only if you need JS-based config)

## Tailwind v4 setup notes

Compared to v3:

- Use `@import "tailwindcss";` (instead of `@tailwind base/components/utilities`).
- If you use PostCSS, configure `@tailwindcss/postcss` — not `tailwindcss`.
- You typically **do not** need `autoprefixer` or `postcss-import` (v4 includes prefixing + import support).

Official docs:

- https://tailwindcss.com/blog/tailwindcss-v4
- https://tailwindcss.com/docs/upgrade-guide
- https://tailwindcss.com/docs/detecting-classes-in-source-files

## Recommended pattern (monorepo apps)

Each app owns its Tailwind build and imports the shared theme tokens.

Example app global CSS (adjust `@source` globs to your framework):

```css
@import "tailwindcss" source(none);

/* Scan this app + any shared packages that contain class strings. */
@source "./src/**/*.{js,jsx,ts,tsx,svelte,vue,mdx,astro}";
@source "../../packages/*/src/**/*.{js,jsx,ts,tsx,svelte,vue,mdx,astro}";
@source not "../../**/*.test.*";
@source not "../../**/*.spec.*";

/* Shared tokens (colors/fonts/spacing/animations/dark variant). */
@import "@cloudflare-northstar/ui/theme.css";
```

If you prefer one entrypoint that scans the whole repo, use `@import "@cloudflare-northstar/ui/monorepo.css";`.

## Design tokens (`@theme`)

`packages/ui/theme.css` defines common Tailwind v4 theme variables:

- Brand palette: `--color-brand-50`…`--color-brand-950` (+ aliases `--color-brand`, `--color-brand-foreground`)
- Semantic colors: `--color-success`, `--color-warning`, `--color-error`, `--color-info`
- Fonts: `--font-sans`, `--font-mono`
- Spacing base: `--spacing` (so `p-4` is `calc(var(--spacing) * 4)`)
- Breakpoints: `--breakpoint-*`
- Animations: `--animate-*` (+ easing `--ease-*`)

Example usage:

- `bg-background text-foreground`
- `bg-brand text-brand-foreground`
- `bg-brand-600 text-white`
- `motion-safe:animate-fade-in`

## Dark mode (no config file)

`theme.css` defines a class-based dark variant:

- `@custom-variant dark (&:where(.dark, .dark *));`

To avoid a flash of incorrect theme when using class-based dark mode, set the theme class early (framework-specific).
Minimal client-side example:

```html
<script>
  (function () {
    const saved = localStorage.getItem("theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.add(saved ?? (system ? "dark" : "light"));
  })();
</script>
```

## Recommended (Vite): `@tailwindcss/vite`

For Vite-based frameworks (SolidStart, SvelteKit, QwikCity, etc.), prefer the first-party Vite plugin:

```ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({ plugins: [tailwindcss()] });
```

If you need Tailwind plugins, add them in your app CSS (and install them in the app):

```css
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
```

## PostCSS config (example)

If your framework expects PostCSS, use the v4 plugin:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## Legacy config (`@config`)

If you need a JS/TS Tailwind config (rare in v4), you can load it from CSS:

```css
@config "../../tailwind.config.js";
```

CSS-driven config (like `@theme`, `@source`, and `@plugin`) takes precedence where possible.

## Workers static assets

Build your app’s CSS at compile time and serve it as a static asset from the public Worker (`apps/web`) via `ASSETS`.
See `apps/web/wrangler.jsonc` for the assets binding pattern.
