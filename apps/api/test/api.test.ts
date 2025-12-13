import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Northstar API", () => {
  it("responds to /health", async () => {
    const res = await SELF.fetch("http://example.com/health");
    expect(res.status).toBe(200);
    expect(UUID_RE.test(res.headers.get("x-request-id") ?? "")).toBe(true);
    await expect(res.json()).resolves.toMatchObject({ ok: true, env: env.ENVIRONMENT });
  });

  it("returns stable error envelopes", async () => {
    const res = await SELF.fetch("http://example.com/nope");
    expect(res.status).toBe(404);
    expect(UUID_RE.test(res.headers.get("x-request-id") ?? "")).toBe(true);

    const json = (await res.json()) as {
      error: { code: string; message: string; requestId: string };
    };
    expect(json.error.code).toBe("not_found");
    expect(json.error.message).toBeTruthy();
    expect(UUID_RE.test(json.error.requestId)).toBe(true);
  });
});
