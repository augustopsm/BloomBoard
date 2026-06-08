import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { AsanaError, getProjectInfo } from "@/lib/asana";

export async function GET() {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const project = await getProjectInfo();
    return NextResponse.json(project);
  } catch (err) {
    if (err instanceof AsanaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error talking to Asana." }, { status: 500 });
  }
}
