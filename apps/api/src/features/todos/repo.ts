import type { Db } from "@cloudflare-northstar/db";
import { todos } from "@cloudflare-northstar/db/schema";

export type TodoRow = typeof todos.$inferSelect;
export type InsertTodoRow = Pick<TodoRow, "id" | "title" | "completed" | "createdAt">;

export async function listTodos(db: Db): Promise<TodoRow[]> {
  return await db.select().from(todos).all();
}

export async function insertTodo(db: Db, row: InsertTodoRow) {
  await db.insert(todos).values(row).run();
}
