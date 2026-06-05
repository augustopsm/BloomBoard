import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { loadRocksAndMilestones } from "@/lib/bloom/service";

// Rocks and their nested milestones come from one upstream call; expose them
// together so the board only triggers a single round-trip.
export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json(await loadRocksAndMilestones(session.token));
  } catch (err) {
    return errorResponse(err);
  }
}
