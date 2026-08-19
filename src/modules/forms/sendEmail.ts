import nodemailer from "nodemailer";

export async function sendLeadEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const host = process.env.SMTP_HOST;
  if (!host) return { sent: false, reason: "smtp-not-configured" };
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "noreply@craft.nordic-builder.ru";
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "1" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { sent: true };
}
