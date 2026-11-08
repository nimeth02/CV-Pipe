import { NextResponse } from "next/server";
import { openPage } from "@/lib/autofill";
import { getProfile, phoneParts } from "@/lib/profile";
import { getRole, roleCvPath } from "@/lib/roles";
import { SITES, getSite, urlMatchesSite } from "@/lib/sites";
import { promises as fs } from "fs";

export async function GET() {
  return NextResponse.json(SITES.map(({ id, name, exampleUrl, requires }) => ({ id, name, exampleUrl, requires })));
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// JSON: { siteId, roleId, url }
// Opens a visible browser at `url`, fills the site's form from the profile + role CV. Does NOT submit.
export async function POST(request: Request) {
  if (process.env.VERCEL) return fail("Sites autofill opens a browser, so it only works when this app runs on your own computer", 501);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Expected JSON", 415);
  const body = (await request.json()) as { siteId?: string; roleId?: string; url?: string };

  const site = body.siteId ? getSite(body.siteId) : null;
  if (!site) return fail("Select a job site");

  const role = body.roleId ? await getRole(body.roleId) : null;
  if (!role) return fail("Select a role");

  let url: URL;
  try {
    url = new URL(String(body.url ?? "").trim());
  } catch {
    return fail("Enter a valid link");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail("Link must start with https://");
  if (!urlMatchesSite(url, site)) return fail(`Link is not a ${site.name} link (${site.hosts.join(", ")})`);

  const profile = await getProfile();
  // No email saved: fall back to the address used for sending applications.
  profile.email ||= process.env.MAIL_FROM || process.env.SMTP_USER || "";
  const phone = phoneParts(profile);
  const missing = site.requires.filter((k) => !profile[k]);
  if (missing.length) return fail(`Fill in "My details" first: ${missing.join(", ")}`);

  if (site.requires.includes("phone") && !phone.full) {
    return fail('Phone needs a country code, e.g. +94706585632, or set Country (edit it in "My details")');
  }

  let cvPath: string | null = null;
  if (role.cvFile) {
    const p = roleCvPath(role.cvFile);
    if (await fs.stat(p).then(() => true, () => false)) cvPath = p;
  }

  try {
    const page = await openPage(url.toString());
    const filled = await site.fill(page, { profile, phone, cvPath });
    return NextResponse.json({ ok: true, filled, cvAttached: Boolean(cvPath) });
  } catch (err) {
    return fail(err instanceof Error ? err.message.split("\n")[0] : String(err), 500);
  }
}
