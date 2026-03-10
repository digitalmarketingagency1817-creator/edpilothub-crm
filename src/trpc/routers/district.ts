import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";

export const districtRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, search } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { county: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [districts, total] = await Promise.all([
        ctx.db.district.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: {
            _count: { select: { schools: true } },
          },
        }),
        ctx.db.district.count({ where }),
      ]);

      return {
        districts,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.district.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        schools: {
          orderBy: { name: "asc" },
          include: {
            pipelineStatus: { select: { stage: true } },
          },
        },
      },
    });
  }),
});
