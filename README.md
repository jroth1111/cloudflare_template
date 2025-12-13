# Cloudflare “Northstar” Template (Monorepo)

An opinionated starter for Cloudflare Workers projects focused on:

- High performance + high security
- Great developer experience (local + remote)
- A reusable backend core that can be consumed by SolidStart / SvelteKit / TanStack Start / QwikCity

## What’s inside

- `apps/api`: private-by-design Cloudflare Worker (Hono) with **vertical slices** + D1/Drizzle + Better Auth
- `apps/web`: public “edge web” Worker that **proxies `/api/*`** to `apps/api` via **Service Bindings**
- `packages/shared`: shared **Zod** schemas/types/helpers for API boundaries
- `packages/db`: shared **Drizzle + D1** DB factory + schema (includes Better Auth tables)
- `packages/ui`: shared **Tailwind v4** CSS entrypoint (framework-agnostic)

## Quickstart

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Then open `http://localhost:8787` (try `/demo`).

Optional CI-style gate:

```bash
pnpm check
```

## Next steps

See `docs/` for:

- Project structure (monorepo + vertical slices)
- D1/Drizzle migrations (local + remote)
- Better-Auth sessions + tokens
- KV + Durable Objects patterns
- Testing (Vitest + workerd + Playwright E2E)
