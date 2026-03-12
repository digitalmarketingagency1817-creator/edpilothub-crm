import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { PipelineStage } from "@/generated/prisma";

export const pipelineRouter = createTRPCRouter({
  remove: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolPipelineStatus.delete({
        where: { schoolId: input.schoolId },
      });
    }),

  getBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schoolPipelineStatus.findUnique({
        where: { schoolId: input.schoolId },
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        stage: z.nativeEnum(PipelineStage),
        lastContactedAt: z.coerce.date().optional(),
        nextFollowUpAt: z.coerce.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schoolId, ...data } = input;
      return ctx.db.schoolPipelineStatus.upsert({
        where: { schoolId },
        create: {
          schoolId,
          agentId: ctx.userId,
          ...data,
        },
        update: {
          ...data,
          agentId: ctx.userId,
        },
      });
    }),
});
