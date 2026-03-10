import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { ProposalStatus } from "@/generated/prisma";

export const proposalRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        rfpOpportunityId: z.string(),
        title: z.string().min(1),
        content: z.string().min(1),
        status: z.nativeEnum(ProposalStatus).default(ProposalStatus.DRAFT),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.proposal.create({
        data: {
          ...input,
          createdById: ctx.userId,
        },
      });
    }),

  getByRfp: protectedProcedure
    .input(z.object({ rfpOpportunityId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.proposal.findMany({
        where: { rfpOpportunityId: input.rfpOpportunityId },
        orderBy: { createdAt: "desc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        status: z.nativeEnum(ProposalStatus).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.proposal.update({ where: { id }, data });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ProposalStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.proposal.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
