import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { RfpStatus, RfpSource } from "@/generated/prisma";

export const rfpRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
        status: z.nativeEnum(RfpStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, search, status } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { agencyName: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(status && { status }),
      };

      const [rfps, total] = await Promise.all([
        ctx.db.rfpOpportunity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { proposals: true } },
          },
        }),
        ctx.db.rfpOpportunity.count({ where }),
      ]);

      return {
        rfps,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.rfpOpportunity.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          proposals: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1),
        agencyName: z.string().min(1),
        agencyState: z.string().optional(),
        sourceUrl: z.url().optional(),
        sourcePlatform: z.nativeEnum(RfpSource).default(RfpSource.OTHER),
        description: z.string().optional(),
        postedDate: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
        estimatedValue: z.string().optional(),
        status: z.nativeEnum(RfpStatus).default(RfpStatus.NEW),
        analysisNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.db.rfpOpportunity.update({ where: { id }, data });
      }
      return ctx.db.rfpOpportunity.create({ data });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(RfpStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rfpOpportunity.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  updateNotes: protectedProcedure
    .input(z.object({ id: z.string(), analysisNotes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rfpOpportunity.update({
        where: { id: input.id },
        data: { analysisNotes: input.analysisNotes },
      });
    }),
});
