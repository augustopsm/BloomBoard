import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { AsanaError, createAsanaTask } from "@/lib/asana";

type CardKind = "milestone" | "todo" | "issue";

// Short tag for the task title prefix, e.g. "[To-Do] Foo".
const TITLE_TAG: Record<CardKind, string> = {
  milestone: "Milestone",
  todo: "To-Do",
  issue: "IDS",
};

// Fuller label for the "Type:" line in the description.
const TYPE_LABEL: Record<CardKind, string> = {
  milestone: "Milestone",
  todo: "To-Do",
  issue: "IDS Issue",
};

interface Body {
  id?: string;
  kind: CardKind;
  name: string;
  /** Parent rock name — only meaningful for milestones. */
  rockName?: string | null;
  /** The Bloom meeting this item belongs to. */
  meeting?: string | null;
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

  if (!body?.name || !body?.kind || !TITLE_TAG[body.kind]) {
    return NextResponse.json(
      { error: "Missing or invalid card data." },
      { status: 400 },
    );
  }

  // Title: "[To-Do] Some title"
  const title = `[${TITLE_TAG[body.kind]}] ${body.name}`;

  // Description lines.
  const lines = [`Type: ${TYPE_LABEL[body.kind]}`];
  if (body.kind === "milestone" && body.rockName) {
    lines.push(`Rock: ${body.rockName}`);
  }
  if (body.meeting) lines.push(`Meeting: ${body.meeting}`);
  if (body.ownerName) lines.push(`Owner: ${body.ownerName}`);
  lines.push("Source: Bloom Growth");
  if (body.bloomUrl) lines.push(`Bloom: ${body.bloomUrl}`);

  try {
    const task = await createAsanaTask({
      name: title,
      notes: lines.join("\n"),
      dueDate: body.dueDate,
    });
    return NextResponse.json({ ok: true, gid: task.gid, url: task.url });
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
