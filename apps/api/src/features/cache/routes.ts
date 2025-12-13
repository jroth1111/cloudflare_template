import { Hono } from "hono";
import type { HonoEnv } from "../../types";

export const cacheRoutes = new Hono<HonoEnv>().get("/demo", async (c) => {
  const key = "demo:cached-timestamp";
  const cached = await c.env.KV.get(key);
  if (cached) {
    return c.json({ cached: true, value: cached });
  }

  const value = new Date().toISOString();
  await c.env.KV.put(key, value, { expirationTtl: 60 });
  return c.json({ cached: false, value });
});
