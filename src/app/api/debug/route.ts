import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { bloomFetch } from "@/lib/bloom/client";
import { endpoints } from "@/lib/bloom/endpoints";
import { toArray } from "@/lib/bloom/transform";

// Temporary: returns raw Bloom payloads so we can verify field names.
// Remove once field mapping is confirmed.
export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  const token = (session as { token: string }).token;
  const rawTodos = toArray(await bloomFetch(token, endpoints.myTodos));
  const rawIssues = toArray(await bloomFetch(token, endpoints.myIssues));
  const rawRocks = toArray(await bloomFetch(token, endpoints.myRocks));
  const rawScorecard = await bloomFetch(token, endpoints.myScorecard).catch(() => null);

  return NextResponse.json({
    todo: rawTodos[0] ?? null,
    issue: rawIssues[0] ?? null,
    rock: rawRocks[0] ?? null,
    scorecard: rawScorecard,
  });
}
