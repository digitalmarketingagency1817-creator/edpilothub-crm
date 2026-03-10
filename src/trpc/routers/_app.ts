import { createTRPCRouter } from "../init";
import { postRouter } from "./post";
import { aiRouter } from "./ai";

export const appRouter = createTRPCRouter({
  post: postRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
