import type { MiddlewareHandler } from "hono";
import { getTrustedOrigins } from "../env";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF mitigation for cookie-based auth:
 * - for state-changing requests that include cookies, require an Origin header
 *   that is explicitly trusted.
 */
export const csrfProtection: MiddlewareHandler = async (c, next) => {
  if (!STATE_CHANGING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const hasCookie = Boolean(c.req.header("cookie"));
  if (!hasCookie) {
    await next();
    return;
  }

  const origin = c.req.header("origin");
  const trusted = getTrustedOrigins(c.env);
  if (!origin || !trusted.includes(origin)) {
    return c.json(
      {
        error: {
          code: "bad_origin",
          message: "Untrusted request origin.",
          requestId: c.get("requestId")
        }
      },
      403
    );
  }

  await next();
};

