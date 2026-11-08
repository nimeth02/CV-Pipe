import { NextResponse } from "next/server";
import { SiteLinkError, getSiteLinks, saveSiteLinks } from "@/lib/siteLinks";

export async function GET() {
  return NextResponse.json(await getSiteLinks());
}

// JSON: { links: { id?, name, url }[] } — replaces the whole list.
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { links?: unknown };
    return NextResponse.json(await saveSiteLinks(body.links));
  } catch (err) {
    if (err instanceof SiteLinkError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Failed to save links" }, { status: 500 });
  }
}
