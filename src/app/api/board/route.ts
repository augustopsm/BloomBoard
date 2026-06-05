import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getTodos, loadRocksAndMilestones } from "@/lib/bloom/service";

// The board's single data source: rocks + their milestones, plus standalone
// to-dos (shown on the board under a synthetic "To-Dos" group).
export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  try {
    const [{ rocks, milestones }, todos] = await Promise.all([
      loadRocksAndMilestones(session.token),
      getTodos(session.token),
    ]);
    return NextResponse.json({ rocks, milestones, todos });
  } catch (err) {
    return errorResponse(err);
  }
}
