import { Hono } from "hono";
import type { HonoEnv } from "../../types";
import { getAuth } from "../../lib/auth";
import { requireUser } from "../../middleware/auth";
import { authRateLimit } from "./rate-limit";

export const authRoutes = new Hono<HonoEnv>()
  .use("/auth/*", authRateLimit)
  .all("/auth/*", (c) => getAuth(c).handler(c.req.raw))
  .get("/me", requireUser, (c) => {
    return c.json({ user: c.get("user"), session: c.get("session") });
  });
