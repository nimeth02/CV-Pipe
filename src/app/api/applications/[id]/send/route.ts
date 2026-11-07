import { NextResponse, type NextRequest } from "next/server";
import { getApplication, updateApplication } from "@/lib/store";
import { sendApplicationEmail } from "@/lib/mailer";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/applications/[id]/send">) {
  const { id } = await ctx.params;
  const app = await getApplication(id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await sendApplicationEmail(app);
    const updated = await updateApplication(id, {
      status: app.status === "Draft" ? "Applied" : app.status,
      sentAt: new Date().toISOString(),
      sendCount: app.sendCount + 1,
      lastError: null,
    });
    return NextResponse.json({ application: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const updated = await updateApplication(id, { lastError: msg });
    return NextResponse.json({ application: updated, error: msg }, { status: 502 });
  }
}
