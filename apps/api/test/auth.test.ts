import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("serves Better Auth JWKS (JWT plugin)", async () => {
  const res = await SELF.fetch("http://example.com/api/auth/jwks");
  expect(res.status).toBe(200);

  const json = (await res.json()) as { keys: unknown[] };
  expect(Array.isArray(json.keys)).toBe(true);
});

function getSetCookies(res: Response): string[] {
  const headers = res.headers as unknown as { getSetCookie?: (this: Headers) => string[] };
  const setCookies = headers.getSetCookie?.call(res.headers);
  if (setCookies?.length) return setCookies;

  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function toCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

function getSessionToken(setCookies: string[]): string | null {
  for (const cookie of setCookies) {
    const pair = cookie.split(";", 1)[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1);
    if (name.endsWith("better-auth.session_token") || name.includes("session_token")) return value;
  }
  return null;
}

it("does not leak session tokens from /api/me", async () => {
  const email = `vitest-${Date.now()}@example.com`;
  const password = "password1234";
  const ip = "203.0.113.1";

  const signUp = await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ name: "Test User", email, password })
  });
  expect(signUp.status).toBeGreaterThanOrEqual(200);
  expect(signUp.status).toBeLessThan(500);

  const signIn = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password })
  });
  expect(signIn.status).toBe(200);

  const cookieHeader = toCookieHeader(getSetCookies(signIn));
  expect(cookieHeader).toContain("=");

  const me = await SELF.fetch("http://example.com/api/me", {
    headers: { cookie: cookieHeader, "CF-Connecting-IP": ip }
  });
  expect(me.status).toBe(200);

  const json = (await me.json()) as {
    user: { id: string; email: string };
    session: Record<string, unknown>;
  };
  expect(json.user.email).toBe(email);
  expect("token" in json.session).toBe(false);
  expect("ipAddress" in json.session).toBe(false);
  expect("userAgent" in json.session).toBe(false);
  expect(Object.keys(json.session).sort()).toEqual(["expiresAt", "id"]);
});

it("issues a JWT from /api/auth/token and accepts bearer session tokens", async () => {
  const email = `vitest-token-${Date.now()}@example.com`;
  const password = "password1234";
  const ip = "203.0.113.2";

  const signUp = await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ name: "Token User", email, password })
  });
  expect(signUp.status).toBeGreaterThanOrEqual(200);
  expect(signUp.status).toBeLessThan(500);

  const signIn = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password })
  });
  expect(signIn.status).toBe(200);

  const setCookies = getSetCookies(signIn);
  const cookieHeader = toCookieHeader(setCookies);
  expect(cookieHeader).toContain("=");

  const jwtRes = await SELF.fetch("http://example.com/api/auth/token", {
    headers: { cookie: cookieHeader, "CF-Connecting-IP": ip }
  });
  expect(jwtRes.status).toBe(200);
  const jwtJson = (await jwtRes.json()) as { token?: string };
  expect(typeof jwtJson.token).toBe("string");
  expect(jwtJson.token?.length).toBeGreaterThan(10);

  const sessionToken = getSessionToken(setCookies);
  expect(typeof sessionToken).toBe("string");
  expect(sessionToken?.length).toBeGreaterThan(10);

  const me = await SELF.fetch("http://example.com/api/me", {
    headers: { Authorization: `Bearer ${sessionToken}`, "CF-Connecting-IP": ip }
  });
  expect(me.status).toBe(200);
  const meJson = (await me.json()) as { user: { email: string } };
  expect(meJson.user.email).toBe(email);
});
