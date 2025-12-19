import type { Db } from "@cloudflare-northstar/db";
import { TodoSchema, type CreateTodoInput } from "@cloudflare-northstar/shared";
import * as repo from "./repo";

export async function list(db: Db, userId: string) {
  const rows = await repo.listTodos(db, userId);
  return rows.map((row) =>
    TodoSchema.parse({
      id: row.id,
      title: row.title,
      completed: row.completed,
      createdAt: row.createdAt.toISOString()
    })
  );
}

export async function create(db: Db, userId: string, input: CreateTodoInput) {
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const completed = false;

  await repo.insertTodo(db, { id, title: input.title, completed, createdAt, userId });

  return TodoSchema.parse({
    id,
    title: input.title,
    completed,
    createdAt: createdAt.toISOString()
  });
}
