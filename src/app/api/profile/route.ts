import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/profile";

export async function GET() {
  return NextResponse.json(await getProfile());
}

// JSON: { firstName, lastName, email, phone }
export async function PUT(request: Request) {
  return NextResponse.json(await saveProfile(await request.json()));
}
