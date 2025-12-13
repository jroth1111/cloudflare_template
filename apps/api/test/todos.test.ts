import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

it("creates and lists todos (D1 + Drizzle)", async () => {
  const create = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "write tests" })
  });
  expect(create.status).toBe(201);

  const created = (await create.json()) as { id: string; title: string };
  expect(created.id).toMatch(/[0-9a-fA-F-]{36}/);
  expect(created.title).toBe("write tests");

  const list = await SELF.fetch("http://example.com/api/todos");
  expect(list.status).toBe(200);
  const todos = (await list.json()) as Array<{ id: string; title: string }>;
  expect(todos.some((t) => t.title === "write tests")).toBe(true);
});

it("returns a unique todo when titles collide", async () => {
  const create1 = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "same-title" })
  });
  expect(create1.status).toBe(201);
  const todo1 = (await create1.json()) as { id: string };

  const create2 = await SELF.fetch("http://example.com/api/todos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "same-title" })
  });
  expect(create2.status).toBe(201);
  const todo2 = (await create2.json()) as { id: string };

  expect(todo1.id).not.toBe(todo2.id);
});

it("creates todos concurrently without ID collisions", async () => {
  const createOne = async () => {
    const res = await SELF.fetch("http://example.com/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "concurrent-title" })
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "" })
  });
  expect(res.status).toBe(400);
  expect(UUID_RE.test(res.headers.get("x-request-id") ?? "")).toBe(true);

  const json = (await res.json()) as { error: { code: string; requestId: string } };
  expect(json.error.code).toBe("validation_error");
  expect(UUID_RE.test(json.error.requestId)).toBe(true);
});
