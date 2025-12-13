import { Hono } from "hono";
import type { HonoEnv } from "../../types";

export const healthRoutes = new Hono<HonoEnv>().get("/", (c) => {
  return c.json({ ok: true, env: c.env.ENVIRONMENT });
});
