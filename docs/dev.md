# Development & Deployment

## Local development

1. Install deps:

```bash
pnpm install
```

2. Configure local secrets/vars:

```bash
cp .dev.vars.example .dev.vars
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

- Local: use repo root `.dev.vars` (dotenv format). Do not commit it.
- Remote: use bulk upload for API secrets via `pnpm secrets:bulk` (uses `wrangler secret bulk` with `apps/api/wrangler.jsonc`).
- Non-secret config can live in `wrangler.jsonc` `vars` (ex: `CORS_ORIGINS`, `AUTH_TRUSTED_ORIGINS`).

Docs: https://developers.cloudflare.com/workers/configuration/secrets/

Note: local `pnpm dev` scripts load `.dev.vars` via `--env-file .dev.vars` so both Workers share one file.

Bulk upload:

```bash
pnpm secrets:bulk
```

This reads `.dev.vars` if present, otherwise uses process environment variables (CI).

### Setup checklist

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
- Upload secrets (deploys immediately): `pnpm secrets:bulk`
- Deploy workers: `pnpm deploy`
- Optional env: `pnpm secrets:bulk -- --env <name>` and `pnpm deploy -- --env <name>`

### Automatic injection (dev)

- `pnpm dev`, `pnpm dev:api`, and `pnpm dev:web` load `.dev.vars` automatically via `--env-file`.
- `pnpm dev:e2e` will generate a temporary `.dev.vars` if missing and clean it up on exit.

### Automatic injection (prod)

- The included workflow (`.github/workflows/deploy.yml`) writes `.dev.vars` from `DEV_VARS`,
  runs `pnpm secrets:bulk`, then runs `pnpm deploy`.
- To target a specific Wrangler environment, pass `-- --env <name>` to `pnpm secrets:bulk`.

GitHub Actions example:

```yaml
- name: Write .dev.vars
  env:
    DEV_VARS: ${{ secrets.DEV_VARS }}
  run: |
    if [ -z "$DEV_VARS" ]; then
      echo "DEV_VARS secret is empty"
      exit 1
    fi
    printf '%s' "$DEV_VARS" > .dev.vars
    chmod 600 .dev.vars

- name: Upload secrets (bulk)
  run: pnpm secrets:bulk
```

Alternative (stdin JSON instead of `DEV_VARS`):

```bash
jq -n \
  --arg better_auth_secret "$BETTER_AUTH_SECRET" \
  --arg better_auth_url "$BETTER_AUTH_URL" \
  '{BETTER_AUTH_SECRET: $better_auth_secret, BETTER_AUTH_URL: $better_auth_url}' | \
  pnpm secrets:bulk
```

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
- `global_fetch_strictly_public` to route same-zone `fetch()` through Cloudflare's public edge (front door) so Workers/routes/security are applied consistently

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
