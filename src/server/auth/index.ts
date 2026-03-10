import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!process.env.RESEND_API_KEY,
    sendResetPassword: async ({ user, url }) => {
      // Don't await — prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },

  session: {
    // Database sessions (default) — more secure than JWT
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes — reduces DB lookups
    },
  },

  plugins: [
    nextCookies(), // MUST be last plugin — handles cookie setting in Server Actions
  ],
});
