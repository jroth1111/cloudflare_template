import { createApp } from "./app";
import { RateLimiterDO } from "./durable-objects/rate-limiter";

export { RateLimiterDO };

export const app = createApp();
export type AppType = typeof app;

export default app;
