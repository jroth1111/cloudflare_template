# Auth (Better Auth)

## Note on Better Auth versions

Cloudflare Workers currently have a bundling/runtime mismatch with some Better Auth releases
(`createRequire(import.meta.url)` when `import.meta.url` is `undefined` in bundled output), which
can prevent `wrangler dev` from starting.

This template pins `better-auth` to `1.4.7-beta.4` in `apps/api/package.json` until the fix lands
in a stable release.

## Endpoints

- Implemented by the API Worker (`apps/api`) and mounted at `/api/auth/*`.
- `GET /api/me` returns a **sanitized** `{ user, session }` for the current session (requires auth).
  - `session` is intentionally limited to `{ id, expiresAt }` (`id` may be `null`) and never includes the session token.
- Public apps should call these endpoints via the public Worker (`apps/web`) which proxies `/api/*`
  to the API Worker via a Service Binding.

## Sessions (default)

- Cookie-based session tokens (stored server-side in D1)
- Cookie session caching enabled (`session.cookieCache`) to reduce DB hits
- KV is configured as Better Auth **secondary storage** (best-effort cache) to further reduce D1 reads

## Cookie hardening

In production, Better Auth cookies are scoped using a `__Host-` cookie prefix plus strict defaults:

- `Path=/`
- `HttpOnly`
- `SameSite=Lax`
- `Secure` (forced via `advanced.useSecureCookies`)

Note: in local development (`http://localhost`), the `__Host-` prefix is intentionally not used because
browsers reject `__Host-`/`__Secure-` cookies that are not `Secure`.

Server-side session retrieval example:

```ts
const session = await getAuth(c).api.getSession({ headers: c.req.raw.headers });
```

This pattern also works inside other Workers entrypoints (including Durable Objects) as long as you
forward the original request headers.

## Proxy rule (no Pages)

This template does **not** use Cloudflare Pages.

For cookie-based auth to work reliably, the browser should talk to a **single public origin**
(your `apps/web` Worker) so `Set-Cookie` headers are delivered to the browser.

- ✅ Browser calls `https://your-web-domain.com/api/auth/...`
- ✅ `apps/web` blindly proxies to `apps/api` (Service Binding) and forwards `Set-Cookie`
- ❌ Browser calls `apps/api` directly (may be private / not publicly routed)

## CSRF mitigation (cookie writes)

For state-changing requests that include cookies (`POST|PUT|PATCH|DELETE`), the API Worker requires an
`Origin` header that matches a trusted allowlist.

- Default trusted origin: `new URL(BETTER_AUTH_URL).origin`
- Add additional trusted origins with `AUTH_TRUSTED_ORIGINS` (comma-separated)

## Auth rate limiting

To protect high-value auth endpoints from brute-force attacks, the API Worker applies a small,
Workers-native rate limiter (Cloudflare Rate Limiting API) in front of Better Auth’s handler.

Default behavior:

- Enabled by default when `ENVIRONMENT=production` (set `AUTH_RATE_LIMIT_ENABLED=false` to disable)
- Rate-limits by **bucket + identity key** (Cloudflare recommends avoiding raw IP keys when possible)
  - `POST /api/auth/sign-in/*` (bucket: `signin`) — key: `email:<normalizedEmail>` (fallback: `ip:<clientIp>`)
  - `POST /api/auth/sign-up/*` (bucket: `signup`) — key: `email:<normalizedEmail>` (fallback: `ip:<clientIp>`)
  - `GET|POST /api/auth/token` (bucket: `token`) — key: `ip:<clientIp>`
- Fail-open: if the limiter errors, requests proceed (auth is not a single point of failure)

Configuration:

- `AUTH_RATE_LIMIT_ENABLED` (`true|false`, optional): force enable/disable regardless of `ENVIRONMENT`
- Rate limit budgets live in `apps/api/wrangler.jsonc` under `ratelimits`:
  - `AUTH_SIGNIN_RATE_LIMITER`
  - `AUTH_SIGNUP_RATE_LIMITER`
  - `AUTH_TOKEN_RATE_LIMITER`

Note: the Rate Limiting API currently returns only `{ success: boolean }` to the Worker, so this
template does not emit `remaining`/`reset` headers from the runtime binding.

Error shape on limit exceeded:

```json
{ "error": { "code": "rate_limited", "message": "Too many requests.", "requestId": "..." } }
```

## Client IP forwarding (split-worker)

When calling auth endpoints from a browser, requests should go through the public Worker (`apps/web`)
which proxies `/api/*` to the API Worker via Service Bindings.

To keep rate limiting/auditing consistent across Worker→Worker calls, `apps/web` forwards the client IP
to `apps/api` as:

- `x-northstar-client-ip: <CF-Connecting-IP>`

The API Worker prefers `CF-Connecting-IP` when present, otherwise it falls back to `x-northstar-client-ip`.

## Tokens

This template enables two Better Auth plugins:

- `bearer()` — allows sending the session token as a Bearer token (for non-cookie clients)
- `jwt()` — exposes JWT + JWKS endpoints for services that need JWT verification

JWT JWKS endpoint:

- `GET /api/auth/jwks`

JWT token endpoint:

- `GET /api/auth/token` (requires a valid session)

### Access/refresh strategy

- **“Refresh”** is the browser session cookie (longer-lived, server-revocable via the `session` table).
- **“Access token”** is the JWT returned by the JWT plugin (short-lived; re-issue by calling `/token` again).

## Environment variables

- `BETTER_AUTH_SECRET` (secret): encryption/signing material (>= 32 chars)
- `BETTER_AUTH_URL` (var or secret): base URL used by Better Auth
  - In production, this must be an `https://...` URL.
- `AUTH_TRUSTED_ORIGINS` (var, optional): comma-separated allowlist for cookie-based write requests (CSRF mitigation)

Local secrets live in `.dev.vars` at the repo root.

## Frontend integration

Better Auth provides framework clients (React/Svelte/Solid) and a vanilla client.
Frontends should point their auth client at the **public Worker** origin (the `apps/web` domain)
and call `signIn`, `signUp`, `getSession`, etc. See Better Auth docs:

https://www.better-auth.com/docs/installation

### Example (framework-agnostic)

```ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:8787" // your deployed apps/web domain in prod
});
```

When using cookie-based sessions cross-origin, ensure:

- `CORS_ORIGINS` includes your frontend origin
- the frontend sends credentials (cookies) with requests
