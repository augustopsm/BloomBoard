import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getTodos, loadRocksAndMilestones } from "@/lib/bloom/service";
import type { Todo } from "@/lib/bloom/types";

// The board's single data source: rocks + their milestones, plus standalone
// to-dos (shown under a synthetic "To-Dos" group). Rocks/milestones are
// essential; to-dos are best-effort — a failure there must not blank the board.
export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const [rm, td] = await Promise.allSettled([
      loadRocksAndMilestones(session.token),
      getTodos(session.token),
    ]);

    if (rm.status === "rejected") throw rm.reason;
    const { rocks, milestones } = rm.value;

    let todos: Todo[] = [];
    if (td.status === "fulfilled") {
      todos = td.value;
    } else {
      // Don't fail the whole board; surface the cause in the server log.
      console.error("[board] to-dos fetch failed:", td.reason);
    }

    return NextResponse.json({ rocks, milestones, todos });
  } catch (err) {
    return errorResponse(err);
  }
}
