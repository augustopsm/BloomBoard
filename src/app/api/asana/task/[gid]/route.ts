import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { AsanaError, taskExists } from "@/lib/asana";

// GET /api/asana/task/{gid} → { exists: boolean }
// Used by the client to detect tasks that were deleted in Asana, so the
// "+ Asana" button can reset and allow re-creation.
export async function GET(
  _req: Request,
  { params }: { params: { gid: string } },
) {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  if (!params?.gid) {
    return NextResponse.json({ error: "Missing task gid." }, { status: 400 });
  }

  try {
    const exists = await taskExists(params.gid);
    return NextResponse.json({ exists });
  } catch (err) {
    if (err instanceof AsanaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error talking to Asana." }, { status: 500 });
  }
}
