import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { AsanaError, createAsanaTask } from "@/lib/asana";

type CardKind = "milestone" | "todo" | "issue";

const KIND_LABEL: Record<CardKind, string> = {
  milestone: "Milestone",
  todo: "To-Do",
  issue: "IDS Issue",
};

interface Body {
  kind: CardKind;
  name: string;
  /** Parent rock name — only meaningful for milestones. */
  rockName?: string | null;
  ownerName?: string | null;
  dueDate?: string | null;
  bloomUrl?: string | null;
}

export async function POST(req: Request) {
  const session = requireSession();
  if (session instanceof NextResponse) return session;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.name || !body?.kind || !KIND_LABEL[body.kind]) {
    return NextResponse.json(
      { error: "Missing or invalid card data." },
      { status: 400 },
    );
  }

  // Build a readable description noting the type and (for milestones) the rock.
  const lines = [`Type: ${KIND_LABEL[body.kind]}`];
  if (body.kind === "milestone" && body.rockName) {
    lines.push(`Rock: ${body.rockName}`);
  }
  if (body.ownerName) lines.push(`Owner: ${body.ownerName}`);
  lines.push("Source: BloomBoard");
  if (body.bloomUrl) lines.push(`Bloom: ${body.bloomUrl}`);

  try {
    const task = await createAsanaTask({
      name: body.name,
      notes: lines.join("\n"),
      dueDate: body.dueDate,
    });
    return NextResponse.json({ ok: true, url: task.url });
  } catch (err) {
    if (err instanceof AsanaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Unexpected error talking to Asana." },
      { status: 500 },
    );
  }
}
