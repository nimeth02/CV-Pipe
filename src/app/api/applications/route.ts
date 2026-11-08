import { NextResponse } from "next/server";
import { createApplication, isValidEmail, listApplications, updateApplication } from "@/lib/store";
import { sendApplicationEmail } from "@/lib/mailer";
import { getRole } from "@/lib/roles";

export async function GET() {
  return NextResponse.json(await listApplications());
}

/** Split "a@x.com, b@y.com\nc@z.com" into a de-duplicated list. */
function parseEmails(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(/[\s,;]+/);
  const seen = new Set<string>();
  return list
    .map((e) => e.trim())
    .filter((e) => e && !seen.has(e.toLowerCase()) && seen.add(e.toLowerCase()));
}

// JSON: { roleId: string, emails: string[] | string }
// Sends the role's email + latest CV to each address and records each successful send.
export async function POST(request: Request) {
  const body = (await request.json()) as { roleId?: string; emails?: unknown };

  const role = body.roleId ? await getRole(body.roleId) : null;
  if (!role) return NextResponse.json({ error: "Select a role" }, { status: 400 });

  const emails = parseEmails(body.emails);
  if (emails.length === 0) return NextResponse.json({ error: "Enter at least one email address" }, { status: 400 });
  const invalid = emails.filter((e) => !isValidEmail(e));
  if (invalid.length) {
    return NextResponse.json({ error: `Invalid email: ${invalid.join(", ")}` }, { status: 400 });
  }

  const subject = role.subject || role.name;
  const message = role.body;

  const applications = [];
  const failed: { email: string; error: string }[] = [];
  let unsaved = 0;

  for (const email of emails) {
    const fields = {
      company: "",
      position: role.name,
      email,
      subject,
      message,
      notes: "",
      status: "Applied" as const,
      cvFile: null,
      roleId: role.id,
    };
    try {
      await sendApplicationEmail({ ...fields, id: "", createdAt: "", sentAt: null, sendCount: 0, lastError: null });
    } catch (err) {
      // Only successfully sent emails are recorded.
      failed.push({ email, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    const sentAt = new Date().toISOString();
    try {
      const app = await createApplication(fields);
      applications.push((await updateApplication(app.id, { sentAt, sendCount: 1 }))!);
    } catch {
      // The email already went out. If history cannot be saved (e.g. read-only disk on Vercel),
      // still report success so the user does not retry and send it twice.
      unsaved++;
      applications.push({
        ...fields,
        id: crypto.randomUUID(),
        createdAt: sentAt,
        sentAt,
        sendCount: 1,
        lastError: null,
      });
    }
  }

  return NextResponse.json(
    { applications, failed, unsaved },
    { status: failed.length === emails.length ? 502 : 201 },
  );
}
