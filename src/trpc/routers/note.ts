import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";

export const noteRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schoolNote.findMany({
        where: { schoolId: input.schoolId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({ schoolId: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolNote.create({
        data: {
          content: input.content,
          schoolId: input.schoolId,
          userId: ctx.session.user.id,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.schoolNote.findUnique({ where: { id: input.id } });
      const userRole = (ctx.session.user as { role?: string }).role;
      if (note?.userId !== ctx.session.user.id && userRole !== "ADMIN") {
        throw new Error("Not authorized");
      }
      return ctx.db.schoolNote.delete({ where: { id: input.id } });
    }),
});
