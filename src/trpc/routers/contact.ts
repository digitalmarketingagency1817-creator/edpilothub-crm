import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";

export const contactRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { schoolId, search, limit, page } = input;
      const skip = (page - 1) * limit;
      const where = {
        ...(schoolId && { schoolId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };
      const [contacts, total] = await Promise.all([
        ctx.db.contact.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
          include: { school: { select: { id: true, name: true } } },
        }),
        ctx.db.contact.count({ where }),
      ]);
      return { contacts, total, pages: Math.ceil(total / limit) };
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.contact.findUniqueOrThrow({
      where: { id: input.id },
      include: { school: { select: { id: true, name: true } } },
    });
  }),

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
