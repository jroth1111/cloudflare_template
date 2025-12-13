import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SIGNIN_LIMIT = 5;

it("rate-limits repeated sign-in attempts", async () => {
  const email = `vitest-rl-${Date.now()}@example.com`;
  const password = "password1234";
  const ip = "203.0.113.9";

  const signUp = await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ name: "Rate Limit User", email, password })
  });
  expect(signUp.status).toBeGreaterThanOrEqual(200);
  expect(signUp.status).toBeLessThan(500);

  const signIn1 = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password })
  });
  expect(signIn1.status).toBe(200);

  for (let i = 1; i < SIGNIN_LIMIT; i += 1) {
    const res = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
      body: JSON.stringify({ email, password })
    });
    expect(res.status).toBe(200);
  }

  const blocked = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password })
  });
  expect(blocked.status).toBe(429);

  const requestId = blocked.headers.get("x-request-id") ?? "";
  expect(UUID_RE.test(requestId)).toBe(true);

  const json = (await blocked.json()) as { error?: { code?: string; requestId?: string } };
  expect(json.error?.code).toBe("rate_limited");
  expect(json.error?.requestId).toBe(requestId);
});

it("supports x-northstar-client-ip for split-worker rate limiting", async () => {
  const email = `vitest-rl-proxy-${Date.now()}@example.com`;
  const password = "password1234";
  const ip = "203.0.113.10";

  const signUp = await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "x-northstar-client-ip": ip },
    body: JSON.stringify({ name: "Proxy Rate Limit User", email, password })
  });
  expect(signUp.status).toBeGreaterThanOrEqual(200);
  expect(signUp.status).toBeLessThan(500);

  const signIn1 = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "x-northstar-client-ip": ip },
    body: JSON.stringify({ email, password })
  });
  expect(signIn1.status).toBe(200);

  for (let i = 1; i < SIGNIN_LIMIT; i += 1) {
    const res = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "x-northstar-client-ip": ip },
      body: JSON.stringify({ email, password })
    });
    expect(res.status).toBe(200);
  }

  const blocked = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "x-northstar-client-ip": ip },
    body: JSON.stringify({ email, password })
  });
  expect(blocked.status).toBe(429);
});
