import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import {
  getIssues,
  getIssuesForUser,
  getTodos,
  getTodosForUser,
  loadRocksAndMilestones,
  loadRocksAndMilestonesForUser,
} from "@/lib/bloom/service";
import { asanaConfigured } from "@/lib/asana";
import type { Issue, Todo } from "@/lib/bloom/types";

// The board's single data source: rocks + milestones + to-dos + issues.
// Rocks/milestones are essential; to-dos and issues are best-effort so a
// failure in either doesn't blank the whole board.
// Optional ?userId= fetches data for a specific team member instead of "mine".
export async function GET(req: NextRequest) {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  const userId = new URL(req.url).searchParams.get("userId") ?? null;

  try {
    const [rm, td, is] = await Promise.allSettled([
      userId
        ? loadRocksAndMilestonesForUser(session.token, userId)
        : loadRocksAndMilestones(session.token),
      userId
        ? getTodosForUser(session.token, userId)
        : getTodos(session.token),
      userId
        ? getIssuesForUser(session.token, userId)
        : getIssues(session.token),
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

    return NextResponse.json({
      rocks,
      milestones,
      todos,
      issues,
      asanaEnabled: asanaConfigured(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
