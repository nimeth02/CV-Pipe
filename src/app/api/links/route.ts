import { NextResponse } from "next/server";
import { getLinks, saveLinks } from "@/lib/links";

export async function GET() {
  return NextResponse.json(await getLinks());
}

// JSON: { linkedin, github, portfolio }
export async function PUT(request: Request) {
  return NextResponse.json(await saveLinks(await request.json()));
}
