import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { AsanaError, getProjectSections, moveTaskToSection } from "@/lib/asana";
import type { ColumnId } from "@/lib/board";

// Maps BloomBoard column ids to Asana section name substrings (case-insensitive).
// We match by substring so minor renames ("On Hold / Blocked" vs "On Hold/Blocked") still work.
const COLUMN_SECTION_HINT: Record<ColumnId, string> = {
  "todo": "backlog",
  "in-progress": "in progress",
  "blocked": "blocked",
  "complete": "done",
};

interface Body {
  taskGid: string;
  column: ColumnId;
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

  if (!body?.taskGid || !body?.column) {
    return NextResponse.json({ error: "Missing taskGid or column." }, { status: 400 });
  }

  const hint = COLUMN_SECTION_HINT[body.column];
  if (!hint) {
    return NextResponse.json({ error: "Unknown column." }, { status: 400 });
  }

  try {
    const sections = await getProjectSections();
    const section = sections.find((s) =>
      s.name.toLowerCase().includes(hint),
    );
    if (!section) {
      return NextResponse.json(
        { error: `No Asana section matching "${hint}" found.` },
        { status: 404 },
      );
    }
    await moveTaskToSection(body.taskGid, section.gid);
    return NextResponse.json({ ok: true, section: section.name });
  } catch (err) {
    if (err instanceof AsanaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error talking to Asana." }, { status: 500 });
  }
}
