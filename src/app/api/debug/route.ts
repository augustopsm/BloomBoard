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

  // Probe a candidate endpoint: report status + a tiny snippet (no full dumps).
  async function probe(path: string) {
    try {
      const data = await bloomFetch(token, path);
      const arr = toArray(data);
      return {
        ok: true,
        count: Array.isArray(data) || arr.length ? arr.length : undefined,
        sample: arr[0] ?? data ?? null,
      };
    } catch (err) {
      const e = err as { status?: number; message?: string };
      return { ok: false, status: e.status ?? null, message: e.message ?? String(err) };
    }
  }

  const rawTodos = toArray(await bloomFetch(token, endpoints.myTodos));
  const ownerId =
    (rawTodos[0]?.Owner as Record<string, unknown> | undefined)?.Id ?? null;

  // Candidate endpoints for listing org users and fetching another user's items.
  const userProbes: Record<string, unknown> = {
    "users (list)": await probe("/api/v1/users"),
    "users/all": await probe("/api/v1/users/all"),
    "users/search": await probe("/api/v1/users/search"),
    "members": await probe("/api/v1/members"),
    "seats": await probe("/api/v1/seats"),
  };

  // If we know a user id, try per-user item endpoints.
  let perUser: Record<string, unknown> = {};
  if (ownerId) {
    perUser = {
      [`rocks/user/${ownerId}`]: await probe(`/api/v1/rocks/user/${ownerId}`),
      [`todo/users/${ownerId}`]: await probe(`/api/v1/todo/users/${ownerId}`),
      [`issues/users/${ownerId}`]: await probe(`/api/v1/issues/users/${ownerId}`),
    };
  }

  return NextResponse.json({ ownerId, userProbes, perUser });
}
