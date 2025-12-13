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

app.use("*", secureHeaders());

app.get("/", (c) => {
  return c.html(
    `<!doctype html><html><head><meta charset="utf-8" /><title>Northstar</title></head><body><h1>Northstar Web</h1><p>Try <a href="/demo">/demo</a>, <a href="/api/todos">/api/todos</a>, or <a href="/api/auth/jwks">/api/auth/jwks</a>.</p></body></html>`
  );
});

app.get("/demo", (c) => {
  return c.html(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Northstar Demo</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; max-width: 52rem; }
      fieldset { border: 1px solid rgba(127,127,127,.4); border-radius: 12px; padding: 1rem; margin: 1rem 0; }
      legend { font-weight: 600; padding: 0 .5rem; }
      label { display: block; margin: .5rem 0 .25rem; }
      input { width: 100%; padding: .6rem .75rem; border-radius: 10px; border: 1px solid rgba(127,127,127,.4); }
      button { margin-top: .75rem; padding: .6rem .9rem; border-radius: 10px; border: 1px solid rgba(127,127,127,.4); background: transparent; cursor: pointer; }
      button:hover { filter: brightness(0.98); }
      .row { display: grid; grid-template-columns: 1fr; gap: .75rem; }
      .status { margin-top: .5rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9rem; }
      .muted { opacity: .7; }
      ul { padding-left: 1.25rem; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    </style>
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

    <script>
      (function () {
        document.body.classList.add("hydrated");

        const out = {
          suStatus: document.getElementById("su-status"),
          siStatus: document.getElementById("si-status"),
          todoStatus: document.getElementById("todo-status"),
          meEmail: document.querySelector('[data-testid="me-email"]'),
          meError: document.querySelector('[data-testid="me-error"]'),
          todoList: document.getElementById("todo-list"),
        };

        const el = {
          suName: document.getElementById("su-name"),
          suEmail: document.getElementById("su-email"),
          suPassword: document.getElementById("su-password"),
          siEmail: document.getElementById("si-email"),
          siPassword: document.getElementById("si-password"),
          todoTitle: document.getElementById("todo-title"),
        };

        async function readJson(res) {
          const text = await res.text();
          try {
            return text ? JSON.parse(text) : null;
          } catch {
            return { raw: text };
          }
        }

        async function postJson(path, body) {
          return await fetch(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });
        }

        async function getJson(path) {
          return await fetch(path, { credentials: "include" });
        }

        async function refreshMe() {
          out.meEmail.textContent = "";
          out.meError.textContent = "";
          const res = await getJson("/api/me");
          const json = await readJson(res);
          if (res.ok) {
            out.meEmail.textContent = json?.user?.email ?? "";
            return;
          }
          out.meError.textContent = json?.error?.code ?? "unknown_error";
        }

        async function refreshTodos() {
          const res = await getJson("/api/todos");
          const todos = await readJson(res);
          out.todoList.innerHTML = "";
          if (!Array.isArray(todos)) return;
          for (const t of todos) {
            const li = document.createElement("li");
            li.textContent = t.title;
            out.todoList.appendChild(li);
          }
        }

        document.getElementById("su-submit").addEventListener("click", async () => {
          out.suStatus.textContent = "Signing up…";
          const res = await postJson("/api/auth/sign-up/email", {
            name: el.suName.value,
            email: el.suEmail.value,
            password: el.suPassword.value,
          });
          const json = await readJson(res);
          out.suStatus.textContent = res.ok ? "Signed up." : JSON.stringify(json);
        });

        document.getElementById("si-submit").addEventListener("click", async () => {
          out.siStatus.textContent = "Signing in…";
          const res = await postJson("/api/auth/sign-in/email", {
            email: el.siEmail.value,
            password: el.siPassword.value,
          });
          const json = await readJson(res);
          out.siStatus.textContent = res.ok ? "Signed in." : JSON.stringify(json);
        });

        document.getElementById("so-submit").addEventListener("click", async () => {
          out.siStatus.textContent = "Signing out…";
          const res = await postJson("/api/auth/sign-out", {});
          const json = await readJson(res);
          out.siStatus.textContent = res.ok ? "Signed out." : JSON.stringify(json);
        });

        document.getElementById("me-submit").addEventListener("click", async () => {
          out.siStatus.textContent = "Fetching session…";
          await refreshMe();
          out.siStatus.textContent = "Done.";
        });

        document.getElementById("todo-create").addEventListener("click", async () => {
          out.todoStatus.textContent = "Creating todo…";
          const res = await postJson("/api/todos", { title: el.todoTitle.value });
          const json = await readJson(res);
          out.todoStatus.textContent = res.ok ? "Created." : JSON.stringify(json);
          await refreshTodos();
        });

        document.getElementById("todo-refresh").addEventListener("click", async () => {
          out.todoStatus.textContent = "Refreshing…";
          await refreshTodos();
          out.todoStatus.textContent = "Done.";
        });
      })();
    </script>
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
