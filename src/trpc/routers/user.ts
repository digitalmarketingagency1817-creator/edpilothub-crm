import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { UserRole } from "@/generated/prisma";

export const userRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.email(),
        password: z.string().min(8),
        role: z.nativeEnum(UserRole),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
      if (caller.role !== "ADMIN") throw new Error("Only admins can create users");

      // Direct creation with bcryptjs (Better Auth admin plugin not enabled)
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.password, 10);
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          emailVerified: true,
        },
      });
      await ctx.db.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hash,
        },
      });
      return user;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
      if (caller.role !== "ADMIN") throw new Error("Only admins can delete users");
      if (input.id === ctx.userId) throw new Error("Cannot delete yourself");
      return ctx.db.user.delete({ where: { id: input.id } });
    }),

  updateRole: protectedProcedure
    .input(z.object({ id: z.string(), role: z.nativeEnum(UserRole) }))
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
      if (caller.role !== "ADMIN") throw new Error("Only admins can change roles");
      return ctx.db.user.update({ where: { id: input.id }, data: { role: input.role } });
    }),
});
