import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("returns CORS headers for allowed origin", async () => {
  const res = await SELF.fetch("http://example.com/api/todos", {
    method: "OPTIONS",
    headers: {
      origin: "https://example.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  // Preflight should succeed
  expect(res.status).toBeLessThan(400);
  expect(res.headers.get("access-control-allow-origin")).toBe("https://example.com");
  expect(res.headers.get("access-control-allow-credentials")).toBe("true");
});

it("returns CORS headers for GET requests from allowed origin", async () => {
  const res = await SELF.fetch("http://example.com/api/health", {
    headers: { origin: "https://example.com" },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBe("https://example.com");
  expect(res.headers.get("access-control-allow-credentials")).toBe("true");
});

it("does not return CORS headers for disallowed origin", async () => {
  const res = await SELF.fetch("http://example.com/api/health", {
    headers: { origin: "https://evil.com" },
  });

  // Request still succeeds (CORS is browser-enforced), but no allow-origin header
  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBeNull();
});

it("handles CORS preflight for disallowed origin", async () => {
  const res = await SELF.fetch("http://example.com/api/todos", {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.com",
      "Access-Control-Request-Method": "POST",
    },
  });

  // Preflight may succeed but without allow-origin
  expect(res.headers.get("access-control-allow-origin")).toBeNull();
});
