import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";

export const contactRouter = createTRPCRouter({
  listBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contact.findMany({
        where: { schoolId: input.schoolId },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        name: z.string().min(1),
        title: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        isPrimary: z.boolean().default(false),
        linkedinUrl: z.url().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primaries
      if (input.isPrimary) {
        await ctx.db.contact.updateMany({
          where: { schoolId: input.schoolId },
          data: { isPrimary: false },
        });
      }
      return ctx.db.contact.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        title: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        isPrimary: z.boolean().optional(),
        linkedinUrl: z.url().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // If setting as primary, unset others in the same school
      if (data.isPrimary) {
        const contact = await ctx.db.contact.findUniqueOrThrow({ where: { id } });
        await ctx.db.contact.updateMany({
          where: { schoolId: contact.schoolId, id: { not: id } },
          data: { isPrimary: false },
        });
      }
      return ctx.db.contact.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contact.delete({ where: { id: input.id } });
    }),
});
