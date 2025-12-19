import { eq } from "drizzle-orm";
import type { Db } from "@cloudflare-northstar/db";
import { todos } from "@cloudflare-northstar/db/schema";

export type TodoRow = typeof todos.$inferSelect;
export type InsertTodoRow = Pick<TodoRow, "id" | "title" | "completed" | "createdAt" | "userId">;

export async function listTodos(db: Db, userId: string): Promise<TodoRow[]> {
  return await db.select().from(todos).where(eq(todos.userId, userId)).all();
}

export async function insertTodo(db: Db, row: InsertTodoRow) {
  await db.insert(todos).values(row).run();
}
