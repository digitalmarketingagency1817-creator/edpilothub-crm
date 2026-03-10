import { z } from "zod/v4";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createTRPCRouter, protectedProcedure } from "../init";

export const aiRouter = createTRPCRouter({
  summarize: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(10000) }))
    .mutation(async ({ input }) => {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Summarize the following content in 2-3 sentences:\n\n${input.text}`,
      });
      return { summary: text };
    }),
});
