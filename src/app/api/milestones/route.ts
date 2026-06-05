import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getMilestones } from "@/lib/bloom/service";

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json({ milestones: await getMilestones(session.token) });
  } catch (err) {
    return errorResponse(err);
  }
}
