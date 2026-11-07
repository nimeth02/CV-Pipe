import { promises as fs } from "fs";
import { NextResponse, type NextRequest } from "next/server";
import { getRole, roleCvPath } from "@/lib/roles";

// Serves the role's current CV so it can be previewed in the browser.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/roles/[id]/cv">) {
  const { id } = await ctx.params;
  const role = await getRole(id);
  if (!role?.cvFile) return NextResponse.json({ error: "No CV for this role" }, { status: 404 });
  try {
    const pdf = await fs.readFile(roleCvPath(role.cvFile));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(role.cvFile)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "CV file missing" }, { status: 404 });
  }
}
