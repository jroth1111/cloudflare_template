import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Bindings } from "./env";
import { getValidatedVars } from "./env";

type WebVars = { requestId: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const app = new Hono<{ Bindings: Bindings; Variables: WebVars }>();

app.use("*", async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const id = incoming && UUID_RE.test(incoming) ? incoming : crypto.randomUUID();
  c.set("requestId", id);

  getValidatedVars(c.env);
  try {
    await next();
  } finally {
    c.header("x-request-id", id);
  }
});

app.use(
  "*",
  secureHeaders({
    // Content Security Policy (strict by default; keep demo assets as static files)
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  })
);

app.get("/", (c) => {
  const vars = getValidatedVars(c.env);
  const demoLink =
    vars.ENVIRONMENT !== "production" ? '<a href="/demo">/demo</a>, ' : "";

  return c.html(
    `<!doctype html><html><head><meta charset="utf-8" /><title>Northstar</title></head><body><h1>Northstar Web</h1><p>Try ${demoLink}<a href="/api/todos">/api/todos</a>, or <a href="/api/auth/jwks">/api/auth/jwks</a>.</p></body></html>`
  );
});

app.get("/demo", (c) => {
  // Gate demo page in production - it's only for development/E2E testing
  const vars = getValidatedVars(c.env);
  if (vars.ENVIRONMENT === "production") {
    return c.text("Not Found", 404);
  }

  return c.html(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Northstar Demo</title>
    <link rel="stylesheet" href="/demo/demo.css" />
  </head>
  <body>
    <h1>Northstar Demo</h1>
    <p class="muted">This is a tiny Workers-only demo page to support real-browser E2E tests. It exercises cookie auth through the <code>/api/*</code> proxy.</p>

    <fieldset>
      <legend>Sign Up</legend>
      <div class="row">
        <div>
          <label for="su-name">Name</label>
          <input id="su-name" autocomplete="name" />
        </div>
        <div>
          <label for="su-email">Email</label>
          <input id="su-email" type="email" autocomplete="email" />
        </div>
        <div>
          <label for="su-password">Password</label>
          <input id="su-password" type="password" autocomplete="new-password" />
        </div>
      </div>
      <button id="su-submit" type="button">Sign Up</button>
      <div id="su-status" class="status" aria-live="polite"></div>
    </fieldset>

    <fieldset>
      <legend>Sign In</legend>
      <div class="row">
        <div>
          <label for="si-email">Email</label>
          <input id="si-email" type="email" autocomplete="email" />
        </div>
        <div>
          <label for="si-password">Password</label>
          <input id="si-password" type="password" autocomplete="current-password" />
        </div>
      </div>
      <button id="si-submit" type="button">Sign In</button>
      <button id="so-submit" type="button">Sign Out</button>
      <button id="me-submit" type="button">Get Session</button>
      <div class="status" aria-live="polite">
        <div>email: <span data-testid="me-email"></span></div>
        <div>error: <span data-testid="me-error"></span></div>
      </div>
      <div id="si-status" class="status" aria-live="polite"></div>
    </fieldset>

    <fieldset>
      <legend>Todos</legend>
      <div class="row">
        <div>
          <label for="todo-title">Title</label>
          <input id="todo-title" />
        </div>
      </div>
      <button id="todo-create" type="button">Create Todo</button>
      <button id="todo-refresh" type="button">Refresh Todos</button>
      <ul data-testid="todos-list" id="todo-list"></ul>
      <div id="todo-status" class="status" aria-live="polite"></div>
    </fieldset>

    <script src="/demo/demo.js"></script>
  </body>
</html>`);
});

// Blind reverse-proxy. Preserves status + headers (including Set-Cookie).
app.all("/api/*", async (c) => {
  const headers = new Headers(c.req.raw.headers);
  if (!headers.has("x-request-id")) headers.set("x-request-id", c.get("requestId"));
  const cfConnectingIp = c.req.header("cf-connecting-ip");
  if (cfConnectingIp) headers.set("x-northstar-client-ip", cfConnectingIp);
  else headers.delete("x-northstar-client-ip");
  const res = await c.env.API.fetch(new Request(c.req.raw, { headers }));

  // Service Binding responses can have immutable headers; clone to allow middleware (secureHeaders)
  // and request-id to set headers without throwing.
  const nextHeaders = new Headers(res.headers);
  const setCookies = (
    res.headers as unknown as { getSetCookie?: (this: Headers) => string[] }
  ).getSetCookie?.call(res.headers);
  if (setCookies?.length) {
    nextHeaders.delete("set-cookie");
    for (const cookie of setCookies) nextHeaders.append("set-cookie", cookie);
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: nextHeaders
  });
});

app.notFound(async (c) => {
  if (!c.env.ASSETS) return c.text("Not Found", 404);

  const res = await c.env.ASSETS.fetch(c.req.raw);
  const nextHeaders = new Headers(res.headers);
  const setCookies = (
    res.headers as unknown as { getSetCookie?: (this: Headers) => string[] }
  ).getSetCookie?.call(res.headers);
  if (setCookies?.length) {
    nextHeaders.delete("set-cookie");
    for (const cookie of setCookies) nextHeaders.append("set-cookie", cookie);
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: nextHeaders
  });
});

export type WebAppType = typeof app;
export default app;
