import { z } from "zod/v4";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";

export const postRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return { posts, nextCursor };
    }),

  byId: baseProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.post.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        imageUrl: z.url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          ...input,
          authorId: ctx.userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        imageUrl: z.url().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.post.update({
        where: { id, authorId: ctx.userId },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.delete({
        where: { id: input.id, authorId: ctx.userId },
      });
    }),
});
