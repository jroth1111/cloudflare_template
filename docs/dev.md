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

Recommended (happy path): run the helper to create D1 + KV and update `apps/api/wrangler.jsonc`:

```bash
pnpm cf:bootstrap
```

Or create resources manually and update `apps/api/wrangler.jsonc` (production env) directly:

```bash
wrangler d1 create northstar-db --env production --config apps/api/wrangler.jsonc --binding DB --update-config
wrangler kv namespace create northstar-kv --env production --config apps/api/wrangler.jsonc --binding KV --update-config
wrangler kv namespace create northstar-kv-preview --preview --env production --config apps/api/wrangler.jsonc --binding KV --update-config
```

Note: local `wrangler dev` uses local D1/KV by default, so placeholder IDs in the top-level config are fine.

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

`apps/api/wrangler.jsonc` enables a few best practices (some production-only):

- `placement: { mode: "smart" }` for latency-sensitive DB/network workloads
  - Trade-off: can increase user-to-worker latency for requests that do little/no backend work; see https://developers.cloudflare.com/workers/configuration/smart-placement/
- `global_fetch_strictly_public` for SSRF hardening on outbound `fetch()`

## Safer rollouts

Wrangler supports versioned rollouts:

```bash
wrangler versions upload --config apps/web/wrangler.jsonc --env production
wrangler versions deploy --config apps/web/wrangler.jsonc --env production
```

## CI

This repo ships with a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check:wrangler` (Wrangler dry-run config/build validation)

## Package the template

To generate a clean `template_repo.zip` (excludes `node_modules`, `.wrangler`, etc.):

```bash
pnpm package:zip
```
