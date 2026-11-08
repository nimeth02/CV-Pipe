import { NextResponse, type NextRequest } from "next/server";
import { RoleError, deleteRole, updateRole } from "@/lib/roles";
import { parseRoleForm } from "../form";

function fail(err: unknown) {
  if (err instanceof RoleError) return NextResponse.json({ error: err.message }, { status: err.status });
  throw err;
}

// multipart/form-data: name, subject, body, cv? (pdf), removeCv?
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/roles/[id]">) {
  const { id } = await ctx.params;
  try {
    const { input, cv, removeCv } = parseRoleForm(await request.formData());
    return NextResponse.json({ role: await updateRole(id, input, cv, removeCv) });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/roles/[id]">) {
  const { id } = await ctx.params;
  try {
    await deleteRole(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
