import type { MiddlewareHandler } from "hono";
import { getValidatedVars } from "../env";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { HonoEnv } from "../types";

export const requestLogger: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const vars = getValidatedVars(c.env);
  const enabled = vars.REQUEST_LOG_ENABLED ? vars.REQUEST_LOG_ENABLED === "true" : true;
  if (!enabled) {
    await next();
    return;
  }

  const start = performance.now();
  const { pathname } = new URL(c.req.raw.url);
  const traceparent = c.req.header("traceparent") ?? null;

  try {
    await next();
    const durationMs = Math.round(performance.now() - start);
    const userId = c.get("user")?.id ?? null;

    logger.info("request", {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: pathname,
      traceparent,
      status: c.res.status,
      durationMs,
      userId
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const userId = c.get("user")?.id ?? null;

    const status = err instanceof HttpError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const logFn = status >= 500 ? logger.warn : logger.info;
    logFn("request_error", {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: pathname,
      traceparent,
      status,
      durationMs,
      userId,
      error: errorMessage
    });
    throw err;
  }
};
