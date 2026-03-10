import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { OutreachType, OutreachDirection, OutreachOutcome } from "@/generated/prisma";

export const outreachRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        contactId: z.string().optional(),
        type: z.nativeEnum(OutreachType),
        direction: z.nativeEnum(OutreachDirection),
        subject: z.string().optional(),
        notes: z.string().optional(),
        outcome: z.nativeEnum(OutreachOutcome),
        scheduledFollowUp: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.outreachLog.create({
        data: {
          ...input,
          agentId: ctx.userId,
        },
      });

      // Update pipeline lastContactedAt
      await ctx.db.schoolPipelineStatus.upsert({
        where: { schoolId: input.schoolId },
        create: {
          schoolId: input.schoolId,
          agentId: ctx.userId,
          lastContactedAt: new Date(),
          nextFollowUpAt: input.scheduledFollowUp,
          stage: "CONTACTED",
        },
        update: {
          lastContactedAt: new Date(),
          ...(input.scheduledFollowUp && { nextFollowUpAt: input.scheduledFollowUp }),
        },
      });

      return log;
    }),

  listBySchool: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        limit: z.number().min(1).max(200).default(50),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { schoolId, limit, page } = input;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        ctx.db.outreachLog.findMany({
          where: { schoolId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            contact: { select: { id: true, name: true, title: true } },
            school: { select: { id: true, name: true } },
          },
        }),
        ctx.db.outreachLog.count({ where: { schoolId } }),
      ]);

      return { logs, total, pages: Math.ceil(total / limit), page };
    }),

  listAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        page: z.number().min(1).default(1),
        agentId: z.string().optional(),
        type: z.nativeEnum(OutreachType).optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, agentId, type, dateFrom, dateTo } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(agentId && { agentId }),
        ...(type && { type }),
        ...((dateFrom ?? dateTo) && {
          createdAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          },
        }),
      };

      const [logs, total] = await Promise.all([
        ctx.db.outreachLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            contact: { select: { id: true, name: true, title: true } },
            school: { select: { id: true, name: true, city: true } },
          },
        }),
        ctx.db.outreachLog.count({ where }),
      ]);

      return { logs, total, pages: Math.ceil(total / limit), page };
    }),
});
