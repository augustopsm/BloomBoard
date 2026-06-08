// Higher-level data fetchers used by the API routes. Each returns normalized
// domain objects so route handlers stay thin.

import { bloomFetch } from "./client";
import { BLOOM_BASE_URL, endpoints } from "./endpoints";
import { toArray, toIssue, toMilestone, toRock, toTodo } from "./transform";
import type { Issue, Milestone, Rock, Todo } from "./types";

export type DetailKind = "todo" | "issue" | "rock" | "milestone";


/**
 * Fetch the current user's rocks, then each rock's milestones (Bloom lists
 * milestones only under their parent rock). Milestone requests run in parallel.
 * Rock completion is derived from milestone progress when a rock has
 * milestones — the most meaningful signal for the board.
 */
export async function loadRocksAndMilestones(
  token: string,
): Promise<{ rocks: Rock[]; milestones: Milestone[] }> {
  const rocks = toArray(await bloomFetch(token, endpoints.myRocks)).map(toRock);

  const milestonesByRock = await Promise.all(
    rocks.map(async (rock) => {
      const raw = toArray(
        await bloomFetch(token, endpoints.milestonesForRock(rock.id)),
      );
      // Stamp the parent rock id in case a milestone omits its own RockId.
      return raw
        .map(toMilestone)
        .map((m) => ({ ...m, rockId: m.rockId ?? rock.id }));
    }),
  );

  rocks.forEach((rock, i) => {
    const ms = milestonesByRock[i];
    if (ms.length > 0) {
      const done = ms.filter((m) => m.complete).length;
      rock.completion = Math.round((done / ms.length) * 100);
    }
  });

  return { rocks, milestones: milestonesByRock.flat() };
}

export async function getRocks(token: string): Promise<Rock[]> {
  return (await loadRocksAndMilestones(token)).rocks;
}

export async function getMilestones(token: string): Promise<Milestone[]> {
  return (await loadRocksAndMilestones(token)).milestones;
}

export async function getTodos(token: string): Promise<Todo[]> {
  const data = await bloomFetch(token, endpoints.myTodos);
  // TodoType enum: 0=Recurrence, 1=Personal, 2=Milestone.
  // Milestone-typed todos are auto-created by Bloom when a milestone is
  // un-completed and must not appear as standalone to-dos on the board.
  return toArray(data)
    .filter((raw) => {
      const t = raw.TodoType ?? raw.todoType;
      return t !== 2 && String(t).toLowerCase() !== "milestone";
    })
    .map(toTodo);
}

export async function getIssues(token: string): Promise<Issue[]> {
  const data = await bloomFetch(token, endpoints.myIssues);
  return toArray(data).map(toIssue);
}

/**
 * Toggle a milestone's completion.
 *
 * Reads expose completion as a string `Status` ("Done"), so the write mirrors
 * that and also sends a `Complete` boolean as a fallback. The exact write
 * contract is the one piece not yet confirmed against the live API — verify
 * with `scripts/test-milestone-write.sh` and adjust this body if needed.
 */
export async function setMilestoneComplete(
  token: string,
  id: string,
  complete: boolean,
): Promise<void> {
  await bloomFetch(token, endpoints.milestone(id), {
    method: "PUT",
    body: JSON.stringify({
      Status: complete ? "Done" : "NotDone",
      Complete: complete,
    }),
  });
}

/**
 * Toggle a to-do's completion via the dedicated complete endpoint.
 * Spec: POST /api/v1/todo/{id}/complete?status=bool → returns boolean
 */
export async function setTodoComplete(
  token: string,
  id: string,
  complete: boolean,
): Promise<void> {
  await bloomFetch(token, endpoints.todoComplete(id, complete), {
    method: "POST",
  });
}

/**
 * Toggle an issue's completion.
 * Spec: POST /api/v1/issues/{id}/complete  body: { complete: bool }
 */
export async function setIssueComplete(
  token: string,
  id: string,
  complete: boolean,
): Promise<void> {
  await bloomFetch(token, endpoints.issueComplete(id), {
    method: "POST",
    body: JSON.stringify({ complete }),
  });
}

/**
 * Fetch an item's notes/details as plain text. Bloom stores these in a
 * "notespad" reached via a two-step hop: the notes endpoint returns a
 * { URL }, and that URL serves the note's HTML. We fetch it server-side with
 * the bearer token and strip the markup. Best-effort: returns null on any
 * failure (milestones have no notes endpoint at all).
 */
export async function getItemDetails(
  token: string,
  kind: DetailKind,
  id: string,
): Promise<string | null> {
  const path =
    kind === "todo"
      ? endpoints.notesForTodo(id)
      : kind === "issue"
        ? endpoints.notesForIssue(id)
        : kind === "rock"
          ? endpoints.notesForRock(id)
          : null;
  if (!path) return null; // milestones have no notes

  let url: string | null = null;
  try {
    const res = await bloomFetch<{ URL?: string; url?: string }>(token, path);
    url = res?.URL ?? res?.url ?? null;
  } catch {
    return null;
  }
  if (!url) return null;

  const abs = /^https?:\/\//i.test(url)
    ? url
    : `${BLOOM_BASE_URL}/${url.replace(/^\//, "")}`;

  try {
    const r = await fetch(abs, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const text = htmlToText(await r.text());
    return text || null;
  } catch {
    return null;
  }
}

/** Strip HTML to readable plain text, preserving line breaks between blocks. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
