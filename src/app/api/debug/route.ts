import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { bloomFetch } from "@/lib/bloom/client";
import { toArray } from "@/lib/bloom/transform";

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  const token = (session as { token: string }).token;

  async function probe(path: string) {
    try {
      const data = await bloomFetch(token, path);
      const arr = toArray(data);
      return { ok: true, count: arr.length, sample: arr[0] ?? data ?? null };
    } catch (err) {
      const e = err as { status?: number; message?: string };
      return { ok: false, status: e.status ?? null, message: e.message ?? String(err) };
    }
  }

  // Known meeting id from the todo's OriginId field
  const meetingId = 215896;

  const results = {
    // Try fetching all org rocks (no user scoping)
    "rocks (all)": await probe("/api/v1/rocks"),
    "rocks/all": await probe("/api/v1/rocks/all"),

    // Meeting-based user discovery using the known OriginId
    [`L10/${meetingId}`]: await probe(`/api/v1/L10/${meetingId}`),
    [`L10/${meetingId}/attendees`]: await probe(`/api/v1/L10/${meetingId}/attendees`),
    [`L10/${meetingId}/users`]: await probe(`/api/v1/L10/${meetingId}/users`),
    [`L10/${meetingId}/rocks`]: await probe(`/api/v1/L10/${meetingId}/rocks`),
    [`L10/${meetingId}/todos`]: await probe(`/api/v1/L10/${meetingId}/todos`),

    // Alternate meeting path patterns
    [`meeting/${meetingId}/attendees`]: await probe(`/api/v1/meeting/${meetingId}/attendees`),
    [`meetings/${meetingId}/attendees`]: await probe(`/api/v1/meetings/${meetingId}/attendees`),
  };

  return NextResponse.json(results);
}
