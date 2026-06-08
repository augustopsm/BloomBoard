import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { bloomFetch } from "@/lib/bloom/client";
import { endpoints } from "@/lib/bloom/endpoints";
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

  const userId = 1059200;

  // 1. Try singular "user" path for todos (vs "users" which returned SPA)
  // 2. Try L10 meetings (likely where org users are discoverable)
  // 3. Try org/team user listing variants
  const results = {
    "todo/user/{id} (singular)": await probe(`/api/v1/todo/user/${userId}`),
    "L10/user/mine": await probe("/api/v1/L10/user/mine"),
    "meeting/user/mine": await probe("/api/v1/meeting/user/mine"),
    "users/mine": await probe("/api/v1/users/mine"),
    "organization/users": await probe("/api/v1/organization/users"),
    "orgusers": await probe("/api/v1/orgusers"),
    "teams": await probe("/api/v1/teams"),
    "company/users": await probe("/api/v1/company/users"),
  };

  // If L10 meetings work, probe the first meeting for attendees
  const l10 = results["L10/user/mine"];
  let meetingAttendees = null;
  if (l10.ok && l10.sample) {
    const meetingId = (l10.sample as Record<string, unknown>)?.Id;
    if (meetingId) {
      meetingAttendees = {
        meetingId,
        attendees: await probe(`/api/v1/L10/${meetingId}/attendees`),
        users: await probe(`/api/v1/L10/${meetingId}/users`),
        members: await probe(`/api/v1/L10/${meetingId}/members`),
        rocks: await probe(`/api/v1/L10/${meetingId}/rocks`),
      };
    }
  }

  return NextResponse.json({ results, meetingAttendees });
}
