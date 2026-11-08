import { NextResponse } from "next/server";
import { RoleError, createRole, listRoles } from "@/lib/roles";
import { parseRoleForm } from "./form";

export async function GET() {
  return NextResponse.json(await listRoles());
}

// multipart/form-data: name, subject, body, cv? (pdf)
export async function POST(request: Request) {
  try {
    const { input, cv } = parseRoleForm(await request.formData());
    return NextResponse.json({ role: await createRole(input, cv) }, { status: 201 });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
