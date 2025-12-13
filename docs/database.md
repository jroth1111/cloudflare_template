# Database (Cloudflare D1 + Drizzle)

## Schema

- Drizzle schema files live in `packages/db/src/schema/**`
- Better Auth’s schema is generated into `packages/db/src/schema/better-auth.ts`

## Generate migrations

```bash
pnpm db:generate
```

This writes SQL migrations to `apps/api/drizzle/`.

## Apply migrations locally

```bash
pnpm db:migrate:local
```

## Apply migrations remotely

```bash
pnpm db:migrate:remote
```

## Better Auth schema generation

When you change Better Auth plugins/options that affect DB schema:

```bash
pnpm auth:schema
pnpm db:generate
```

Then apply migrations locally/remotely as needed.

## Notes

- Prefer migrations (`drizzle-kit generate` + `wrangler d1 migrations apply`) over “push” in production.
- For Drizzle Studio over the D1 HTTP API, see Drizzle’s `d1-http` driver docs:
  https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit

## Optional: D1 Sessions API (read replication)

D1’s Sessions API can provide **sequential consistency** for read-after-write flows when read replication is enabled,
by anchoring a request to a session bookmark and returning that bookmark to the caller.

This template includes small helpers in `packages/db/src/d1-sessions.ts`:

- `createD1SessionFromRequest(db, request)` (reads `x-d1-bookmark`)
- `attachD1BookmarkHeader(response, session)` (sets `x-d1-bookmark`)
- `retryWhile(..., shouldRetryD1SessionError)` (transient retry helper)

Reference implementation:
https://developers.cloudflare.com/d1/best-practices/read-replication/#use-sessions-api
