import { NextResponse } from "next/server";
import { BloomApiError } from "@/lib/bloom/client";
import { getSession, type Session } from "@/lib/session";

/**
 * Resolve the current session or short-circuit with a 401. Usage:
 *
 *   const session = requireSession();
 *   if (session instanceof NextResponse) return session;
 */
export function requireSession(): Session | NextResponse {
  const session = getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }
  return session;
}

/** Turn a thrown error into a sensible JSON response. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof BloomApiError) {
    // A 401 from Bloom means the token expired — surface it as such.
    return NextResponse.json(
      { error: err.message },
      { status: err.status === 401 ? 401 : 502 },
    );
  }
  return NextResponse.json(
    { error: "Unexpected error talking to Bloom Growth." },
    { status: 500 },
  );
}
