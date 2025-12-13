# Security Checklist (Northstar)

This template ships with secure defaults, but security is contextual. Use this as a baseline.

## Secrets and env vars

- Never commit `.dev.vars`.
- Use `wrangler secret put` for production secrets (ex: `BETTER_AUTH_SECRET`).
- Validate env vars with Zod at runtime (see `apps/api/src/env.ts`).

## Cookies, sessions, and CSRF

- Prefer **same-origin proxy** for cookie sessions:
  - browser → `apps/web` (public) → Service Binding → `apps/api`
- The API Worker enforces an `Origin` allowlist for cookie-based write requests (`POST|PUT|PATCH|DELETE`):
  - default trusted origin: `new URL(BETTER_AUTH_URL).origin`
  - add trusted origins via `AUTH_TRUSTED_ORIGINS` (comma-separated)
- Use bearer/JWT patterns only when you understand token storage risks.

## Request validation

- Validate all external input with Zod (JSON bodies, query params, route params, headers).
- Treat TypeScript as compile-time only; never trust unvalidated input at runtime.

## CORS

- Avoid CORS when possible by using the same-origin proxy model.
- If you must enable CORS, use an allowlist; do not use `*` with credentials.
  - In production, `apps/api` rejects `CORS_ORIGINS=*` at startup.

## Outbound fetch SSRF hardening

- In production, `apps/api` enables `global_fetch_strictly_public` to restrict `fetch()` to public IP ranges.

## KV usage

- KV is eventually consistent: treat it as a cache or best-effort secondary store.
- Do not use KV as a source of truth for locks, inventory, or counters.

## Durable Objects

- Use Durable Objects for strong consistency and coordination.
- Authenticate/authorize DO-backed endpoints.
- Keep DO state minimal; persist important state to D1.

## Observability

- Responses include `x-request-id`; error envelopes include `requestId`.
- Enable `observability` and `upload_source_maps` in production Workers.
