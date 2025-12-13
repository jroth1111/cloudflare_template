# AGENTS.md — Cloudflare “Northstar” Template

This repo is a Cloudflare Workers monorepo optimized for **security**, **performance**, and **DX**.

## Repo Map

- `apps/api/`: Worker backend (Hono) using **vertical slices** in `src/features/*` (owns D1 + Better Auth)
- `apps/web/`: public Worker that proxies `/api/*` → `apps/api` via **Service Bindings**
- `packages/shared/`: shared **Zod** schemas/types/helpers for API boundaries
- `packages/db/`: shared **Drizzle + D1** DB factory + schema (includes Better Auth tables)
- `packages/ui/`: shared **Tailwind v4** CSS entrypoint for any frontend app
- `docs/`: guidance for structure, migrations, auth, and testing

## Non-Negotiables (Patterns)

- **Split-worker architecture**
  - `apps/api` is the **source of truth** for DB + auth + business logic.
  - `apps/web` (or any framework worker) is the **public edge entrypoint** and must proxy `/api/*` to `env.API`.
  - ❌ Never call the API via `fetch("https://...")` from another Worker.
  - ✅ Use **Service Bindings** (`env.API.fetch(...)`) for Worker→Worker calls.
- **Vertical slices**: add new functionality under `apps/api/src/features/<domain>/`
  - Canonical slice files (adjust as needed):
    - `routes.ts` (HTTP surface)
    - `repo.ts` (DB access)
    - `service.ts` (business logic)
    - `schemas.ts` (Zod validation, when not using `packages/shared`)
- **Runtime validation**: validate all external input with **Zod**
  - Request JSON, query params, headers, and env vars
- **D1 + Drizzle**: schema lives in `packages/db/src/schema/**`
  - Generate migrations via `pnpm db:generate` (or `pnpm -C apps/api db:generate`)
  - Apply migrations via Wrangler (local/remote): `pnpm db:migrate:*`
- **Better Auth**: mounted under `GET|POST /api/auth/*`
  - Cookies are the default session mechanism; JWT/Bearer are opt-in patterns for non-cookie clients
  - KV is used as **secondary storage** (best-effort cache) to reduce D1 hits
  - Public-facing apps must proxy `/api/auth/*` so `Set-Cookie` reaches the browser
- **Security defaults**
  - Cookie-based state-changing requests require a trusted `Origin` (`AUTH_TRUSTED_ORIGINS`) to mitigate CSRF.
  - Errors use a stable envelope: `{ error: { code, message, requestId } }` and responses include `x-request-id`.
- **Secrets**: never commit secrets; use `.dev.vars` locally and `wrangler secret put` remotely
  - Prefer `env` bindings + Zod parsing. Even though `nodejs_compat` can populate `process.env`, treat
    it as a compatibility escape hatch (or for Node-side CLIs), not a primary config mechanism.

## Anti-Patterns (Avoid)

- Storing secrets in `wrangler.jsonc` `vars`
- Skipping Zod validation “because TypeScript”
- Cross-slice imports of internal modules (prefer shared `packages/*` for truly shared code)
- Ad-hoc SQL strings in handlers (use Drizzle or isolated SQL helpers in the slice)
- Adding framework-specific frontend assumptions inside `apps/api`
- Putting D1/Drizzle calls in `apps/web` or browser code

## How To Add a New Feature Slice

1. Create `apps/api/src/features/<feature>/routes.ts`
2. Add Zod schemas in the slice (or reuse `packages/shared`)
3. Add any tables in `packages/db/src/schema/<feature>.ts`
4. Run migrations:
   - `pnpm db:generate`
   - `pnpm db:migrate:local`
5. Mount the slice in `apps/api/src/app.ts`
6. Add tests under `apps/api/test/`

## Testing Rules

- Use Workers-native Vitest via `@cloudflare/vitest-pool-workers`
- Keep tests deterministic: prefer in-process `SELF.fetch(...)`
- If you add bindings for tests, update:
  - `apps/api/vitest.config.ts` (Miniflare bindings)
  - `apps/api/test/cloudflare-env.d.ts` (type augmentation for `cloudflare:test`)
- For real-browser E2E tests, use Playwright (`pnpm test:e2e`)
  - ✅ Test critical user journeys and cookie/session behavior via the public Worker origin
  - ❌ Avoid jsdom/Happy-DOM for “E2E”; they miss real browser timing and cookie behavior
  - ❌ Avoid over-mocking network requests (prefer real Workers + real D1 locally)
  - ✅ Prefer accessibility selectors (`getByRole`, `getByLabel`) over CSS selectors

## Commands (Most Used)

- Install: `pnpm install`
- Dev: `pnpm dev`
- Dev (auto-migrate): `pnpm dev:setup`
- Tests: `pnpm test`
- E2E (Playwright): `pnpm test:e2e`
- Typecheck: `pnpm typecheck`
- Check (lint + types + tests + wrangler dry-run): `pnpm check`
- Generate migrations: `pnpm db:generate`
- Apply migrations (local): `pnpm db:migrate:local`
- Apply migrations (remote): `pnpm db:migrate:remote`
- Deploy + migrate: `pnpm deploy:with-migrations`
- (Re)generate Better Auth schema: `pnpm auth:schema`
- Bootstrap CF resources: `pnpm cf:bootstrap`
- Package template zip: `pnpm package:zip`
