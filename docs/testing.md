# Testing (Vitest + Workers Runtime)

This template uses a **2-tier** strategy:

- **Unit + integration**: `@cloudflare/vitest-pool-workers` (runs inside real `workerd`)
- **E2E (real browser)**: Playwright (validates cookies, UI timing, and full flows)

## Run tests

```bash
pnpm test
```

## Smoke checklist

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Then in another terminal:

```bash
curl -fsS http://localhost:8787/api/health
curl -fsS http://localhost:8787/api/todos
```

## Run E2E tests (Playwright)

1. Install browsers once:

```bash
pnpm exec playwright install
```

2. Run:

```bash
pnpm test:e2e
```

Notes:

- For a quick local run (Chromium only): `pnpm test:e2e:fast`
- Local E2E uses `pnpm dev:e2e` (starts both Workers and writes a temporary `apps/api/.dev.vars` if missing).
- To run against a deployed environment, set `E2E_BASE_URL` and run `pnpm test:e2e:remote`.
  - Local E2E uses an isolated persistence dir: `.wrangler/state-e2e/` (so it doesn't collide with normal `wrangler dev` state).

## D1 migrations in tests

`apps/api/vitest.config.ts` reads migrations from `apps/api/drizzle/` and injects them as a
test-only binding. `apps/api/test/apply-migrations.ts` applies them via `applyD1Migrations(...)`.

## Durable Objects in tests

Use `env.<DO_BINDING>.get(id).fetch(...)` to interact with a Durable Object stub in tests.

## Adding new bindings

1. Add the binding to `apps/api/wrangler.jsonc`
2. Add test-only bindings in `apps/api/vitest.config.ts` if needed
3. Update `apps/api/test/cloudflare-env.d.ts` to type `import { env } from "cloudflare:test"`

## References

- Cloudflare Workers Vitest integration:
  https://developers.cloudflare.com/workers/testing/vitest-integration/
