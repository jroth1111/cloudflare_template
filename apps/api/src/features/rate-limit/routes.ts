import { Hono } from "hono";
import type { HonoEnv } from "../../types";
import { getClientIp } from "../../lib/client-ip";

export const rateLimitRoutes = new Hono<HonoEnv>().get("/demo", async (c) => {
  const ip = getClientIp(c.req.raw);
  const id = c.env.RATE_LIMITER.idFromName(ip);
  const stub = c.env.RATE_LIMITER.get(id);

  const res = await stub.fetch("https://do/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: 10, windowMs: 60_000 })
  });

  const data = (await res.json()) as unknown;
  return c.json(data);
});
