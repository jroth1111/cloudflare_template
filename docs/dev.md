# Development & Deployment

## Local development

1. Install deps:

```bash
pnpm install
```

2. Configure local secrets for Wrangler:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

3. Apply local D1 migrations:

```bash
pnpm db:migrate:local
```

4. Start the split-worker dev stack:

```bash
pnpm dev
```

This runs both Workers with Wrangler multi-config:

- `apps/web` is the public entrypoint at `http://localhost:8787`
- `apps/api` is reached via Service Binding from `apps/web`

The web Worker includes a tiny demo page at `/demo` (used by Playwright E2E tests).

Optional: run setup + dev in one command:

```bash
pnpm dev:setup
```

Run a single Worker if preferred:

- API only: `pnpm dev:api`
- Web only: `pnpm dev:web`

## Static assets (Workers, not Pages)

This template targets **Cloudflare Workers** (not Cloudflare Pages).

If/when you add a real frontend (SolidStart/SvelteKit/TanStack Start/QwikCity), use the framework’s
Cloudflare Workers adapter and/or the Cloudflare Vite plugin for a Workers-native dev server, and
configure static assets on the **web Worker**.

This repo includes an optional `ASSETS` pattern in `apps/web` (see `apps/web/wrangler.jsonc`).

## Secrets & environment variables

- Local: use `apps/api/.dev.vars` (dotenv format). Do not commit it.
- Remote: use `wrangler secret put` for secrets (ex: `BETTER_AUTH_SECRET`).
- Non-secret config can live in `wrangler.jsonc` `vars` (ex: `CORS_ORIGINS`, `AUTH_TRUSTED_ORIGINS`).

Docs: https://developers.cloudflare.com/workers/configuration/secrets/

Note: if you use `.dev.vars`, Wrangler will not load values from `.env` into the Worker runtime.
Use `.env` only for Node-side CLIs (optional), and `.dev.vars` for Worker runtime secrets.

## Provision Cloudflare resources (D1 + KV)

Option A (explicit IDs): create resources in your Cloudflare account:

```bash
wrangler d1 create northstar-db
wrangler kv namespace create northstar-kv
```

Then copy the returned IDs into `apps/api/wrangler.jsonc`:

- `d1_databases[0].database_id`
- `kv_namespaces[0].id`

You can also run an optional helper that creates resources and updates `apps/api/wrangler.jsonc`:

```bash
pnpm cf:bootstrap
```

Option B (automatic provisioning): delete the `database_id` / `id` fields from
`apps/api/wrangler.jsonc` and let Wrangler provision resources on first deploy.

## Deploy

```bash
pnpm deploy
```

Optional: deploy + run remote migrations:

```bash
pnpm deploy:with-migrations
```

By default, `apps/api` is deployed **without public routes** in the `production` environment
(`workers_dev: false` + `routes: []`). It is still reachable from `apps/web` via Service Bindings.

After deploy, apply remote migrations:

```bash
pnpm db:migrate:remote
```

## Production knobs

`apps/api/wrangler.jsonc` enables a few production-only best practices:

- `placement: { mode: "smart" }` for latency-sensitive DB/network workloads
  - Trade-off: can increase user-to-worker latency for requests that do little/no backend work; see https://developers.cloudflare.com/workers/configuration/smart-placement/
- `global_fetch_strictly_public` for SSRF hardening on outbound `fetch()`

## Safer rollouts

Wrangler supports versioned rollouts:

```bash
wrangler versions upload --config apps/web/wrangler.jsonc --env production
wrangler versions deploy --config apps/web/wrangler.jsonc --env production
```

## Package the template

To generate a clean `template_repo.zip` (excludes `node_modules`, `.wrangler`, etc.):

```bash
pnpm package:zip
```
