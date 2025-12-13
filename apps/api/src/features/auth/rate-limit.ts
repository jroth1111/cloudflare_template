import type { MiddlewareHandler } from "hono";
import { getValidatedVars } from "../../env";
import { getClientIp } from "../../lib/client-ip";
import type { HonoEnv } from "../../types";

type RateLimitBucket = "signin" | "signup" | "token";

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

  const limiter =
    bucket === "signin"
      ? c.env.AUTH_SIGNIN_RATE_LIMITER
      : bucket === "signup"
        ? c.env.AUTH_SIGNUP_RATE_LIMITER
        : c.env.AUTH_TOKEN_RATE_LIMITER;

  let ok: boolean | null = null;
  try {
    const result = await limiter.limit({ key: `auth:${bucket}:${ip}` });
    ok = result.success;
  } catch {
    await next();
    return;
  }

  if (!ok) {
    return c.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many requests.",
          requestId: c.get("requestId")
        }
      },
      429
    );
  }

  await next();
};
