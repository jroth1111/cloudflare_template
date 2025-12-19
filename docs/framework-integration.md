# Framework Integration (SolidStart, SvelteKit, TanStack Start, QwikCity)

This template is designed so `apps/api` can be reused behind any UI runtime.

## Recommended: same-origin proxy

Best DX + best security for cookie sessions:

- Browser talks only to the **public UI origin** (your `apps/web` Worker or a framework Worker).
- UI Worker proxies `/api/*` → `apps/api` via a **Service Binding** (`env.API.fetch(request)`).
- No public network hop, no CORS complexity, `Set-Cookie` works reliably.

## Cloudflare Workers + Vite plugin

If your framework supports Workers-native dev/build via Vite, prefer the Cloudflare Vite plugin:

https://developers.cloudflare.com/workers/vite-plugin/

By default, the template already wires an `ASSETS` binding so that you can drop a framework build output
into `apps/web/public/` (or another directory) and have the Worker keep serving `/api/*` while also serving
static pages and chunks via `env.ASSETS.fetch(...)`.

## Framework notes

### SolidStart / Solid

- Proxy `/api/*` in your server entry / middleware to `platform.env.API.fetch(request)`.
- Reuse schemas from `@cloudflare-northstar/shared`.
- Import Tailwind theme tokens from `@cloudflare-northstar/ui/theme.css` (see `docs/tailwind.md`).

### SvelteKit

- Proxy in `handle` hook: `/api/*` → `platform.env.API.fetch(request)`.
- Server-side load functions can call the Service Binding directly.

Example `hooks.server.ts`:

```ts
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api/")) {
    return event.platform!.env.API.fetch(event.request);
  }
  return resolve(event);
};
```

### TanStack Start (React)

- For Workers SSR: same-origin proxy is identical to the `apps/web` pattern.
- For SPA-only: prefer token/JWT mode; cookie sessions become more complex cross-origin.

### QwikCity

- Use middleware (`onRequest`) to proxy `/api/*`.
- Loaders/actions can call the Service Binding directly.

Example `src/entry.cloudflare-pages.ts` / middleware (Workers adapter equivalent):

```ts
export const onRequest = async ({ request, platform, next }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return platform.env.API.fetch(request);
  return next();
};
```

## Shared pieces

- Auth: `apps/api` exposes `/api/auth/*` (proxy through your public Worker)
- Validation: `@cloudflare-northstar/shared` (Zod schemas + helpers)
- DB schema/types: `@cloudflare-northstar/db/schema`
- Tailwind v4 theme: `@cloudflare-northstar/ui/theme.css` (or the convenience entrypoint `@cloudflare-northstar/ui/styles.css`)

## Bundler note: transpile workspace packages

This repo’s workspace packages ship source (TS/CSS). Some framework bundlers require explicit config
to transpile them (especially in SSR).

Examples:

- Next.js: `transpilePackages: ["@cloudflare-northstar/shared", "@cloudflare-northstar/db", "@cloudflare-northstar/ui"]`
- Vite SSR (SvelteKit/SolidStart/TanStack Start/QwikCity): `ssr.noExternal: ["@cloudflare-northstar/shared", "@cloudflare-northstar/db", "@cloudflare-northstar/ui"]`
