# Cloudflare “Northstar” Template (Monorepo)

An opinionated starter for Cloudflare Workers projects focused on:

- High performance + high security
- Great developer experience (local + remote)
- A reusable backend core that can be consumed by SolidStart / SvelteKit / TanStack Start / QwikCity

## Objective

Create an optimized Cloudflare “Northstar” template repo that serves as a framework-agnostic starter for many app types (blog, dashboard, marketplace, etc.) without hardcoding a specific use case.

Split-worker rationale: keep the public entrypoint thin while routing `/api/*` to a private-by-design API Worker via Service Bindings for a clean security boundary.

## Core stack & guarantees

- TypeScript with strict config tuned for Workers and shared packages
- Zod validation for requests, query params, and env bindings
- Drizzle + D1 with local and remote migration patterns
- KV and Durable Objects included as first-class patterns
- Better Auth with D1-backed schema/migrations and session/token guidance
- Wrangler config optimized for local dev and production deploys
- Secrets handling via `.dev.vars` locally and `pnpm secrets:bulk` remotely (CI-friendly)
- Testing scaffolding for Workers, D1/Drizzle, Durable Objects, and Playwright E2E

## Quick architecture

```
Browser
  |
  v
apps/web (public worker)
  |
  v  Service Binding: env.API.fetch(...)
apps/api (private worker)
  |
  v
D1 + KV + Durable Objects
```

## Service Bindings (why + how)

- Worker-to-worker calls stay on the Cloudflare edge without a public URL, which reduces latency and avoids CORS complexity.
- The public Worker proxies `/api/*` to the private API Worker via the `API` binding:

```ts
if (url.pathname.startsWith("/api/")) return env.API.fetch(request);
```

## Constraints (why)

- Service Bindings avoid outbound HTTPS hops and keep intra-worker calls on the Cloudflare edge.
- `apps/web` proxies `/api/*` so `Set-Cookie` reaches the browser from the public origin.
- `apps/api` stays private-by-design to minimize surface area and centralize auth/data logic.
- Keep DB/auth as a single source of truth to prevent cross-app drift and security gaps.

## What’s inside

- `apps/api`: private-by-design Cloudflare Worker (Hono) with **vertical slices** + D1/Drizzle + Better Auth
- `apps/web`: public “edge web” Worker that **proxies `/api/*`** to `apps/api` via **Service Bindings** so cookies are set on the public origin
- `packages/shared`: shared **Zod** schemas/types/helpers for API boundaries
- `packages/db`: shared **Drizzle + D1** DB factory + schema (includes Better Auth tables)
- `packages/ui`: shared **Tailwind v4** CSS entrypoint (framework-agnostic)

## Options & configuration

- Bindings: D1 `DB`, KV `KV`, Durable Object `RATE_LIMITER`, Rate Limiting API `AUTH_*`, Service Binding `API`, optional assets `ASSETS` (see `apps/web/wrangler.jsonc`)
- Feature toggles: `AUTH_RATE_LIMIT_ENABLED`, `D1_SESSIONS_ENABLED`, `REQUEST_LOG_ENABLED`
- Required env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, `AUTH_TRUSTED_ORIGINS`, `ENVIRONMENT`
- Details in `docs/dev.md`, `docs/auth.md`, and `docs/database.md`

## Quickstart

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Then open `http://localhost:8787` (try `/demo`).

## Setup checklist

Local dev:

```bash
cp .dev.vars.example .dev.vars
```

- Required keys: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Production requirement (when you switch to prod): `BETTER_AUTH_URL` must be `https://`

Production deploy:

- CI secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DEV_VARS`
  - `DEV_VARS` should contain the full `.dev.vars` content (same format as local, including newlines)
  - Create it in GitHub: Settings > Secrets and variables > Actions > New repository secret
- Keep `DEV_VARS` in sync when you add new keys to `.dev.vars`
- The deploy workflow writes `.dev.vars` from `DEV_VARS` and runs `pnpm secrets:bulk` automatically
- Upload secrets (deploys immediately): `pnpm secrets:bulk`
- Deploy workers: `pnpm deploy`
- Optional env: `pnpm secrets:bulk -- --env <name>` and `pnpm deploy -- --env <name>`

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
