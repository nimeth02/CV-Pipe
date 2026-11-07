import { NextResponse, type NextRequest } from "next/server";
import { STATUSES, deleteApplication, isValidEmail, updateApplication, type Application } from "@/lib/store";

const EDITABLE = ["company", "position", "email", "subject", "message", "notes", "status"] as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;

  const patch: Partial<Application> = {};
  for (const key of EDITABLE) {
    if (typeof body[key] === "string") (patch as Record<string, string>)[key] = (body[key] as string).trim();
  }
  if (patch.status && !(STATUSES as readonly string[]).includes(patch.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (patch.email !== undefined && !isValidEmail(patch.email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const app = await updateApplication(id, patch);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application: app });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const ok = await deleteApplication(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
