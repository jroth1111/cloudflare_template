import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getCorsOrigins } from "./env";
import { HttpError } from "./lib/errors";
import type { HonoEnv } from "./types";
import { requestId } from "./middleware/request-id";
import { bindContext } from "./middleware/bindings";
import { csrfProtection } from "./middleware/security";
import { authRoutes } from "./features/auth/routes";
import { cacheRoutes } from "./features/cache/routes";
import { healthRoutes } from "./features/health/routes";
import { rateLimitRoutes } from "./features/rate-limit/routes";
import { todosRoutes } from "./features/todos/routes";

export function createApp() {
  const app = new Hono<HonoEnv>();

  app.use("*", requestId);
  app.use("*", secureHeaders());
  app.use("*", bindContext);
  app.use(
    "/api/*",
    cors({
      origin: (origin, c) => {
        const allowed = getCorsOrigins(c.env);
        // When `credentials: true`, browsers reject `Access-Control-Allow-Origin: *`.
        // If `CORS_ORIGINS` contains `*`, echo the request Origin when present; otherwise omit ACAO.
        if (!origin) return undefined;
        if (allowed === "*") return origin;
        return allowed.includes(origin) ? origin : undefined;
      },
      allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
      exposeHeaders: [
        "x-request-id",
        "x-ratelimit-limit",
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
        "retry-after"
      ],
      maxAge: 600,
      credentials: true
    })
  );
  app.use("/api/*", csrfProtection);

  app.get("/", (c) => c.text("Northstar API"));
  app.route("/health", healthRoutes);
  app.route("/api/health", healthRoutes);
  app.route("/api", authRoutes);
  app.route("/api/todos", todosRoutes);
  app.route("/api/cache", cacheRoutes);
  app.route("/api/rate-limit", rateLimitRoutes);

  app.notFound((c) =>
    c.json(
      { error: { code: "not_found", message: "Not found", requestId: c.get("requestId") } },
      404
    )
  );

  app.onError((err, c) => {
    const requestId = c.get("requestId");
    if (err instanceof HttpError) {
      return c.json(
        { error: { code: err.code, message: err.message, requestId } },
        err.status
      );
    }

    console.error("request error", requestId, err);
    return c.json(
      { error: { code: "internal_error", message: "Internal error", requestId } },
      500
    );
  });

  return app;
}
