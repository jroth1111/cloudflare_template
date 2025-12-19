import { SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

let cookieHeader = "";
const ip = "203.0.113.50"; // Different IP from rate limit tests

beforeEach(async () => {
  const email = `todos-test-${Date.now()}-${crypto.randomUUID()}@example.com`;
  const password = "password1234";

  const signUp = await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ name: "Todo Test User", email, password }),
  });
  if (signUp.status >= 400) {
    throw new Error(`Sign-up failed: ${signUp.status} ${await signUp.text()}`);
  }

  const signIn = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password }),
  });
  if (signIn.status >= 400) {
    throw new Error(`Sign-in failed: ${signIn.status} ${await signIn.text()}`);
  }

  cookieHeader = toCookieHeader(getSetCookies(signIn));
  if (!cookieHeader) {
    throw new Error("No session cookie received from sign-in");
  }
});

it("requires authentication for todos", async () => {
  const res = await SELF.fetch("http://example.com/api/todos");
  expect(res.status).toBe(401);
});

it("creates and lists todos (D1 + Drizzle)", async () => {
  const create = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
      "CF-Connecting-IP": ip,
      origin: "https://example.com",
    },
    body: JSON.stringify({ title: "write tests" }),
  });
  expect(create.status).toBe(201);

  const created = (await create.json()) as { id: string; title: string };
  expect(created.id).toMatch(/[0-9a-fA-F-]{36}/);
  expect(created.title).toBe("write tests");

  const list = await SELF.fetch("http://example.com/api/todos", {
    headers: { cookie: cookieHeader, "CF-Connecting-IP": ip },
  });
  expect(list.status).toBe(200);
  const todos = (await list.json()) as Array<{ id: string; title: string }>;
  expect(todos.some((t) => t.title === "write tests")).toBe(true);
});

it("returns a unique todo when titles collide", async () => {
  const create1 = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
      "CF-Connecting-IP": ip,
      origin: "https://example.com",
    },
    body: JSON.stringify({ title: "same-title" }),
  });
  expect(create1.status).toBe(201);
  const todo1 = (await create1.json()) as { id: string };

  const create2 = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
      "CF-Connecting-IP": ip,
      origin: "https://example.com",
    },
    body: JSON.stringify({ title: "same-title" }),
  });
  expect(create2.status).toBe(201);
  const todo2 = (await create2.json()) as { id: string };

  expect(todo1.id).not.toBe(todo2.id);
});

it("creates todos concurrently without ID collisions", async () => {
  const createOne = async () => {
    const res = await SELF.fetch("http://example.com/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
        "CF-Connecting-IP": ip,
        origin: "https://example.com",
      },
      body: JSON.stringify({ title: "concurrent-title" }),
    });
    expect(res.status).toBe(201);
    return (await res.json()) as { id: string };
  };

  const created = await Promise.all(Array.from({ length: 10 }, () => createOne()));
  const ids = created.map((t) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("rejects invalid todo input (runtime validation)", async () => {
  const res = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
      "CF-Connecting-IP": ip,
      origin: "https://example.com",
    },
    body: JSON.stringify({ title: "" }),
  });
  expect(res.status).toBe(400);
  expect(UUID_RE.test(res.headers.get("x-request-id") ?? "")).toBe(true);

  const json = (await res.json()) as { error: { code: string; requestId: string } };
  expect(json.error.code).toBe("validation_error");
  expect(UUID_RE.test(json.error.requestId)).toBe(true);
});

it("isolates todos between users", async () => {
  // Create a second user
  const email2 = `todos-test-2-${Date.now()}@example.com`;
  const password2 = "password5678";

  await SELF.fetch("http://example.com/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ name: "Todo Test User 2", email: email2, password: password2 }),
  });

  const signIn2 = await SELF.fetch("http://example.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email: email2, password: password2 }),
  });
  const cookieHeader2 = toCookieHeader(getSetCookies(signIn2));

  // Create a todo as user 2
  const create = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader2,
      "CF-Connecting-IP": ip,
      origin: "https://example.com",
    },
    body: JSON.stringify({ title: "user2-only-todo" }),
  });
  expect(create.status).toBe(201);

  // User 1 should NOT see user 2's todo
  const list1 = await SELF.fetch("http://example.com/api/todos", {
    headers: { cookie: cookieHeader, "CF-Connecting-IP": ip },
  });
  const todos1 = (await list1.json()) as Array<{ title: string }>;
  expect(todos1.some((t) => t.title === "user2-only-todo")).toBe(false);

  // User 2 should see their own todo
  const list2 = await SELF.fetch("http://example.com/api/todos", {
    headers: { cookie: cookieHeader2, "CF-Connecting-IP": ip },
  });
  const todos2 = (await list2.json()) as Array<{ title: string }>;
  expect(todos2.some((t) => t.title === "user2-only-todo")).toBe(true);
});
