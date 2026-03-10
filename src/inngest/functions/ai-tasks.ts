import { inngest } from "../client";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Long-running AI task — offloaded to background
export const generateSummary = inngest.createFunction(
  {
    id: "generate-summary",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "app/content.summarize" },
  async ({ event, step }) => {
    const { text } = event.data;

    const result = await step.run("summarize", async () => {
      return generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Summarize the following content in 2-3 sentences:\n\n${text}`,
      });
    });

    return { summary: result.text };
  }
);
