# Architecture (Monorepo + Vertical Slices)

## Structure

```
cloudflare_template/
  apps/
    api/                 # Private-by-design API Worker (Hono, D1, Better Auth)
    web/                 # Public edge Worker (proxies /api/* -> api via Service Bindings)
  packages/
    shared/              # Zod schemas/types/helpers shared with frontends
    db/                  # Drizzle schema + D1 DB factory
    ui/                  # Tailwind v4 shared CSS entrypoint
  docs/
```

## Split-worker model (recommended)

- `apps/api` owns **data + auth + business logic** (D1/Drizzle + Better Auth).
- `apps/web` is the **public entrypoint** and proxies `/api/*` to `apps/api` via a Service Binding (`env.API`).

Why:

- Isolation: UI/framework concerns don’t take down your API worker.
- Security: the API worker can be deployed with **no public routes** and reached only via Service Bindings.
- Speed: Worker→Worker calls via Service Bindings avoid a public network hop.

## Vertical slices in `apps/api`

Add features by domain:

```
apps/api/src/features/
  auth/                  # Better Auth wiring + session helpers
  todos/                 # Example D1+Drizzle slice
  cache/                 # Example KV slice
  rate-limit/            # Example Durable Objects slice
```

Each slice owns:

- Routes (Hono handlers)
- Zod schemas (runtime validation) or shared schemas from `packages/shared`
- Data access (Drizzle queries / repositories) and business logic

## Shared code

Use `packages/*` for things that genuinely must be shared across apps/frameworks:

- `packages/shared`: API request/response schemas, Zod helpers
- `packages/db`: shared Drizzle schema + `createDb` for D1
- `packages/ui`: shared Tailwind v4 setup for any frontend app
