import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

it("blocks cookie-based writes without a trusted Origin (CSRF mitigation)", async () => {
  const res = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "session=fake"
    },
    body: JSON.stringify({ title: "csrf" })
  });

  expect(res.status).toBe(403);
  expect(UUID_RE.test(res.headers.get("x-request-id") ?? "")).toBe(true);

  const json = (await res.json()) as { error: { code: string; requestId: string } };
  expect(json.error.code).toBe("bad_origin");
  expect(UUID_RE.test(json.error.requestId)).toBe(true);
});

it("allows cookie-based writes with a trusted Origin", async () => {
  const res = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "session=fake",
      origin: "https://example.com"
    },
    body: JSON.stringify({ title: "csrf-ok" })
  });

  expect(res.status).toBe(201);
});
