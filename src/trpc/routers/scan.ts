import { createTRPCRouter, protectedProcedure } from "../init";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";

export const scanRouter = createTRPCRouter({
  triggerWebsiteScan: protectedProcedure.mutation(async ({ ctx }) => {
    const role = (ctx.session.user as { role?: string }).role;
    if (role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }

    await inngest.send({
      name: "crm/school.website.scan",
      data: { batchSize: 150 },
    });

    return { triggered: true };
  }),
});
