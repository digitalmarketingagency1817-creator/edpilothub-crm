import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { OpportunityStage } from "@/generated/prisma";

export const opportunityRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
        stage: z.nativeEnum(OpportunityStage).optional(),
        schoolId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, search, stage, schoolId } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { school: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
        ...(stage && { stage }),
        ...(schoolId && { schoolId }),
      };

      const [opportunities, total] = await Promise.all([
        ctx.db.opportunity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            school: { select: { id: true, name: true, city: true } },
            owner: { select: { id: true, name: true } },
          },
        }),
        ctx.db.opportunity.count({ where }),
      ]);

      return {
        opportunities,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        schoolId: z.string(),
        stage: z.nativeEnum(OpportunityStage).default(OpportunityStage.NEW),
        value: z.number().optional(),
        closeDate: z.coerce.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opportunity.create({
        data: {
          ...input,
          ownerId: ctx.userId,
        },
        include: {
          school: { select: { id: true, name: true, city: true } },
          owner: { select: { id: true, name: true } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        stage: z.nativeEnum(OpportunityStage).optional(),
        value: z.number().optional().nullable(),
        closeDate: z.coerce.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.opportunity.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opportunity.delete({ where: { id: input.id } });
    }),
});
