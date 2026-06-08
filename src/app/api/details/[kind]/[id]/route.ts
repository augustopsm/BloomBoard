import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { getItemNotesUrl, type DetailKind } from "@/lib/bloom/service";

const VALID: DetailKind[] = ["todo", "issue", "rock", "milestone"];

export async function GET(
  _req: Request,
  { params }: { params: { kind: string; id: string } },
) {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  if (!VALID.includes(params.kind as DetailKind)) {
    return NextResponse.json({ error: "Unknown item kind." }, { status: 400 });
  }

  try {
    const url = await getItemNotesUrl(
      session.token,
      params.kind as DetailKind,
      params.id,
    );
    return NextResponse.json({ url });
  } catch (err) {
    return errorResponse(err);
  }
}
