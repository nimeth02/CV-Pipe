import { NextResponse } from "next/server";

// Reports whether email sending is configured (values come from .env.local).
export async function GET() {
  return NextResponse.json({
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    fromAddress: process.env.MAIL_FROM || process.env.SMTP_USER || null,
  });
}
