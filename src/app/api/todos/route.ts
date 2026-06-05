import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getTodos } from "@/lib/bloom/service";

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json({ todos: await getTodos(session.token) });
  } catch (err) {
    return errorResponse(err);
  }
}
