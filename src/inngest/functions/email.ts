import { inngest } from "../client";
import { sendEmail } from "@/server/email";

// Background email — triggered by event, retries on failure
export const sendWelcomeEmail = inngest.createFunction(
  {
    id: "send-welcome-email",
    retries: 5,
    concurrency: {
      limit: 10,
    },
  },
  { event: "app/user.created" },
  async ({ event, step }) => {
    await step.run("send-email", async () => {
      await sendEmail({
        to: event.data.email,
        subject: "Welcome to our app!",
        html: `<h1>Welcome, ${event.data.name}!</h1><p>We're glad you're here.</p>`,
      });
    });
  }
);

// Delayed onboarding email — 3 days after signup
export const sendOnboardingEmail = inngest.createFunction(
  { id: "send-onboarding-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    await step.sleep("wait-3-days", "3d");

    await step.run("send-onboarding", async () => {
      await sendEmail({
        to: event.data.email,
        subject: "How's it going?",
        html: "<p>Just checking in — how are you finding the app?</p>",
      });
    });
  }
);
