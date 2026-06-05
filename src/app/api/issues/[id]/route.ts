import { NextResponse } from "next/server";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { setIssueComplete } from "@/lib/bloom/service";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  let complete: unknown;
  try {
    ({ complete } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof complete !== "boolean") {
    return NextResponse.json(
      { error: "`complete` must be a boolean." },
      { status: 400 },
    );
  }

  try {
    await setIssueComplete(session.token, params.id, complete);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
