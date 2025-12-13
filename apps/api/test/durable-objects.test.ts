import { env } from "cloudflare:test";
import { expect, it } from "vitest";

it("rate limiter durable object responds", async () => {
  const id = env.RATE_LIMITER.idFromName("test");
  const stub = env.RATE_LIMITER.get(id);

  const res = await stub.fetch("https://do/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: 2, windowMs: 1000 })
  });

  expect(res.status).toBe(200);
  const json = (await res.json()) as { allowed: boolean };
  expect(json.allowed).toBe(true);
});

it("rate limiter durable object enforces limits under concurrency", async () => {
  const id = env.RATE_LIMITER.idFromName(`concurrent:${crypto.randomUUID()}`);
  const stub = env.RATE_LIMITER.get(id);

  const limit = 5;
  const windowMs = 60_000;
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      stub.fetch("https://do/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit, windowMs })
      })
    )
  );

  for (const res of responses) expect(res.status).toBe(200);
  const json = (await Promise.all(responses.map((res) => res.json()))) as Array<{ allowed: boolean }>;

  const allowedCount = json.filter((r) => r.allowed).length;
  expect(allowedCount).toBe(limit);
});
