import { inngest } from "../client";
import { db } from "@/server/db";

// Daily cleanup — runs every day at 3:00 AM UTC
export const dailyCleanup = inngest.createFunction(
  { id: "daily-cleanup" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    // Step 1: Clean expired sessions
    const deleted = await step.run("clean-sessions", async () => {
      const result = await db.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return result.count;
    });

    // Step 2: Clean expired verifications
    await step.run("clean-verifications", async () => {
      await db.verification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    });

    return { deletedSessions: deleted };
  }
);
