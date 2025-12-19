import type { MiddlewareHandler } from "hono";
import { getValidatedVars } from "../../env";
import { getClientIp } from "../../lib/client-ip";
import type { HonoEnv } from "../../types";

type RateLimitBucket = "signin" | "signup" | "token";

// Rate limit configuration (must match wrangler.jsonc)
const RATE_LIMITS: Record<RateLimitBucket, { limit: number; period: number }> = {
  signin: { limit: 5, period: 60 },
  signup: { limit: 3, period: 60 },
  token: { limit: 30, period: 60 },
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getEmailFromJsonBody(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    const json: unknown = await request.clone().json();
    if (!json || typeof json !== "object") return null;
    const email = (json as Record<string, unknown>).email;
    if (typeof email !== "string") return null;
    const normalized = normalizeEmail(email);
    return normalized ? normalized : null;
  } catch {
    return null;
  }
}

function getBucket(c: Parameters<MiddlewareHandler<HonoEnv>>[0]): RateLimitBucket | null {
  const { pathname } = new URL(c.req.raw.url);
  if (!pathname.startsWith("/api/auth/")) return null;

  if (c.req.method === "POST" && pathname.startsWith("/api/auth/sign-in/")) return "signin";

  if (c.req.method === "POST" && pathname.startsWith("/api/auth/sign-up/")) return "signup";

  if ((c.req.method === "GET" || c.req.method === "POST") && pathname === "/api/auth/token")
    return "token";

  return null;
}

function isEnabled(env: HonoEnv["Bindings"]): boolean {
  const vars = getValidatedVars(env);
  if (vars.AUTH_RATE_LIMIT_ENABLED) return vars.AUTH_RATE_LIMIT_ENABLED === "true";
  return vars.ENVIRONMENT === "production";
}

/**
 * Auth-specific rate limiter backed by Cloudflare's Rate Limiting API bindings.
 *
 * Fail-open: if the rate limit check errors, requests proceed so auth doesn't become a single point of failure.
 */
export const authRateLimit: MiddlewareHandler<HonoEnv> = async (c, next) => {
  if (!isEnabled(c.env)) {
    await next();
    return;
  }

  const bucket = getBucket(c);
  if (!bucket) {
    await next();
    return;
  }

  const ip = getClientIp(c.req.raw);
  let key = `auth:${bucket}:ip:${ip}`;
  if (bucket === "signin" || bucket === "signup") {
    const email = await getEmailFromJsonBody(c.req.raw);
    if (email) key = `auth:${bucket}:email:${email}`;
  }

  const limiter =
    bucket === "signin"
      ? c.env.AUTH_SIGNIN_RATE_LIMITER
      : bucket === "signup"
        ? c.env.AUTH_SIGNUP_RATE_LIMITER
        : c.env.AUTH_TOKEN_RATE_LIMITER;

  let ok: boolean | null = null;
  try {
    const result = await limiter.limit({ key });
    ok = result.success;
  } catch {
    await next();
    return;
  }

  const config = RATE_LIMITS[bucket];

  // Set rate limit headers (RFC 6585 style)
  // Note: Cloudflare's simple rate limiter doesn't expose remaining count,
  // so we provide informational headers based on config
  c.header("X-RateLimit-Limit", String(config.limit));
  c.header("X-RateLimit-Policy", `${config.limit};w=${config.period}`);

  if (!ok) {
    c.header("X-RateLimit-Remaining", "0");
    c.header("Retry-After", String(config.period));
    return c.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many requests.",
          requestId: c.get("requestId"),
        },
      },
      429
    );
  }

  await next();
};
