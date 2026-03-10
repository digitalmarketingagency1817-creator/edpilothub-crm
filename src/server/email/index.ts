import "server-only";

import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email:", { to, subject });
    return;
  }

  const from = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";
  const resend = getResend();

  const { error } = html
    ? await resend.emails.send({ from, to, subject, html })
    : await resend.emails.send({ from, to, subject, text: text ?? "" });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}
