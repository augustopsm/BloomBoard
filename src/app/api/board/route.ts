import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getIssues, getTodos, loadRocksAndMilestones } from "@/lib/bloom/service";
import type { Issue, Todo } from "@/lib/bloom/types";

// The board's single data source: rocks + milestones + to-dos + issues.
// Rocks/milestones are essential; to-dos and issues are best-effort so a
// failure in either doesn't blank the whole board.
export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const [rm, td, is] = await Promise.allSettled([
      loadRocksAndMilestones(session.token),
      getTodos(session.token),
      getIssues(session.token),
    ]);

    if (rm.status === "rejected") throw rm.reason;
    const { rocks, milestones } = rm.value;

    let todos: Todo[] = [];
    if (td.status === "fulfilled") {
      todos = td.value;
    } else {
      console.error("[board] to-dos fetch failed:", td.reason);
    }

    let issues: Issue[] = [];
    if (is.status === "fulfilled") {
      issues = is.value;
    } else {
      console.error("[board] issues fetch failed:", is.reason);
    }

    return NextResponse.json({ rocks, milestones, todos, issues });
  } catch (err) {
    return errorResponse(err);
  }
}
