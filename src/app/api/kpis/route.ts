import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { bloomFetch } from "@/lib/bloom/client";
import { endpoints } from "@/lib/bloom/endpoints";
import { toArray } from "@/lib/bloom/transform";

export interface KPIMetric {
  id: string;
  title: string;
  value: number | null;
  goal: number | null;
  unit: string | null;
  /** true = at/above goal, false = below, null = no goal set */
  onTrack: boolean | null;
}

function toMetric(raw: Record<string, unknown>): KPIMetric | null {
  const id = String(raw.Id ?? raw.id ?? "");
  const title =
    String(raw.Title ?? raw.title ?? raw.Name ?? raw.name ?? "").trim();
  if (!id || !title) return null;

  const rawVal = raw.Value ?? raw.value ?? raw.CurrentValue ?? raw.currentValue;
  const rawGoal = raw.Goal ?? raw.goal ?? raw.Target ?? raw.target;
  const value = rawVal != null ? Number(rawVal) : null;
  const goal = rawGoal != null ? Number(rawGoal) : null;
  const unit = String(raw.Modifiers ?? raw.modifiers ?? raw.Unit ?? raw.unit ?? "").trim() || null;

  let onTrack: boolean | null = null;
  if (value !== null && goal !== null && !isNaN(value) && !isNaN(goal) && goal !== 0) {
    onTrack = value >= goal;
  }

  return { id, title, value: isNaN(value as number) ? null : value, goal: isNaN(goal as number) ? null : goal, unit, onTrack };
}

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  const token = (session as { token: string }).token;

  try {
    const raw = toArray(await bloomFetch(token, endpoints.myScorecard));
    const metrics = raw
      .map((r) => toMetric(r as Record<string, unknown>))
      .filter((m): m is KPIMetric => m !== null);
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
