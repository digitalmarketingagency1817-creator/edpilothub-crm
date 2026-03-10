import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  sendWelcomeEmail,
  sendOnboardingEmail,
  processUploadedFile,
  generateSummary,
  dailyCleanup,
} from "@/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmail,
    sendOnboardingEmail,
    processUploadedFile,
    generateSummary,
    dailyCleanup,
  ],
});
