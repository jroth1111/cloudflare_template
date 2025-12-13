import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import type { Bindings } from "../env";

const CheckRequestSchema = z.object({
  limit: z.number().int().positive(),
  windowMs: z.number().int().positive()
});

type CounterState = {
  windowStart: number;
  count: number;
};

export class RateLimiterDO extends DurableObject<Bindings> {
  override async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method !== "POST" || pathname !== "/check") {
      return new Response("Not found", { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = CheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "validation_error" }, { status: 400 });
    }

    const now = Date.now();
    const { limit, windowMs } = parsed.data;

    const next = await this.ctx.storage.transaction(async (txn) => {
      const current = (await txn.get<CounterState>("counter")) ?? { windowStart: now, count: 0 };
      const windowExpired = now - current.windowStart >= windowMs;
      const updated: CounterState = windowExpired
        ? { windowStart: now, count: 1 }
        : { windowStart: current.windowStart, count: current.count + 1 };
      await txn.put("counter", updated);
      return updated;
    });

    const allowed = next.count <= limit;
    const reset = next.windowStart + windowMs;
    const remaining = Math.max(0, limit - next.count);

    return Response.json({ allowed, limit, remaining, reset });
  }
}
