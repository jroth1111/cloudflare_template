import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("smoke: Durable Object rate limiter works", async () => {
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const res = await SELF.fetch("http://example.com/api/rate-limit/demo", {
    headers: { "x-northstar-client-ip": ip }
  });

  expect(res.status).toBe(200);
  const json = (await res.json()) as Record<string, unknown>;
  expect(json.allowed).toBe(true);
  expect(json.limit).toBe(10);
  expect(typeof json.remaining).toBe("number");
  expect(typeof json.reset).toBe("number");
});

