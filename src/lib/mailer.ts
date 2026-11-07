import nodemailer from "nodemailer";
import { promises as fs } from "fs";
import { cvDisplayName, cvPath, type Application } from "./store";
import { getRole, roleCvPath } from "./roles";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env.local");
  }
  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendApplicationEmail(app: Application) {
  const transport = getTransport();
  const fromName = process.env.MAIL_FROM_NAME;
  const fromAddr = process.env.MAIL_FROM || process.env.SMTP_USER!;

  const attachments = [];
  if (app.cvFile) {
    const content = await fs.readFile(cvPath(app.cvFile)).catch(() => {
      throw new Error(`CV file "${cvDisplayName(app.cvFile!)}" not found on server`);
    });
    attachments.push({ filename: cvDisplayName(app.cvFile), content });
  } else if (app.roleId) {
    const role = await getRole(app.roleId);
    if (role?.cvFile) {
      const content = await fs.readFile(roleCvPath(role.cvFile)).catch(() => {
        throw new Error(`CV for role "${role.name}" not found in assets folder`);
      });
      attachments.push({ filename: role.cvFile, content });
    }
  }

  const signature = fromName ? `\n${fromName}` : "";
  const text = app.message + signature;

  return transport.sendMail({
    from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
    to: app.email,
    subject: app.subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`,
    attachments,
  });
}
