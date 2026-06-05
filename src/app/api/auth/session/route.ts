import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    userName: session.userName,
    expiresAt: session.expiresAt,
  });
}
