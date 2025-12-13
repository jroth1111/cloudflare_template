import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(280),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoInputSchema = z.object({
  title: z.string().min(1).max(280),
});

export type CreateTodoInput = z.infer<typeof CreateTodoInputSchema>;

export * from "./zod";
