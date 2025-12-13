import type { MiddlewareHandler } from "hono";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requestId: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const id = incoming && UUID_RE.test(incoming) ? incoming : crypto.randomUUID();
  c.set("requestId", id);
  try {
    await next();
  } finally {
    c.header("x-request-id", id);
  }
};
