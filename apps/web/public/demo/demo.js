(() => {
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
