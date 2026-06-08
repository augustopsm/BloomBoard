import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getTeamMembers } from "@/lib/bloom/service";

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const members = await getTeamMembers(session.token);
    return NextResponse.json(members);
  } catch (err) {
    return errorResponse(err);
  }
}
