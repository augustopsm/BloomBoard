// Higher-level data fetchers used by the API routes. Each returns normalized
// domain objects so route handlers stay thin.

import { bloomFetch } from "./client";
import { BLOOM_BASE_URL, endpoints } from "./endpoints";
import { toArray, toIssue, toMilestone, toOwner, toRock, toTodo } from "./transform";
import type { Issue, Milestone, Rock, TeamMember, Todo } from "./types";

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
  return attachMilestones(token, rocks);
}

/**
 * Fetch each rock's milestones and derive rock completion. Per-rock fetches are
 * best-effort: a rock that 400s/404s (Bloom rejects some rocks, e.g. archived
 * or cross-team ones) contributes no milestones rather than failing the board.
 */
async function attachMilestones(
  token: string,
  rocks: Rock[],
): Promise<{ rocks: Rock[]; milestones: Milestone[] }> {
  const milestonesByRock = await Promise.all(
    rocks.map(async (rock) => {
      try {
        const raw = toArray(
          await bloomFetch(token, endpoints.milestonesForRock(rock.id)),
        );
        // Stamp the parent rock id in case a milestone omits its own RockId.
        return raw
          .map(toMilestone)
          .map((m) => ({ ...m, rockId: m.rockId ?? rock.id }));
      } catch (err) {
        console.error(`[board] milestones for rock ${rock.id} failed:`, err);
        return [] as Milestone[];
      }
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
 * Load rocks + milestones for any user by their Bloom user ID.
 * Reuses the same per-rock milestone fan-out as the "mine" version.
 */
export async function loadRocksAndMilestonesForUser(
  token: string,
  userId: string,
): Promise<{ rocks: Rock[]; milestones: Milestone[] }> {
  const rocks = toArray(await bloomFetch(token, endpoints.rocksForUser(userId))).map(toRock);
  return attachMilestones(token, rocks);
}

export async function getTodosForUser(token: string, userId: string): Promise<Todo[]> {
  const data = await bloomFetch(token, endpoints.todosForUser(userId));
  return toArray(data)
    .filter((raw) => {
      const t = raw.TodoType ?? raw.todoType;
      return t !== 2 && String(t).toLowerCase() !== "milestone";
    })
    .map(toTodo);
}

export async function getIssuesForUser(token: string, userId: string): Promise<Issue[]> {
  const data = await bloomFetch(token, endpoints.issuesForUser(userId));
  return toArray(data).map(toIssue);
}

/**
 * Fetch all attendees of an L10 meeting as TeamMembers.
 * The meetingId is read from the BLOOM_MEETING_ID env var; falls back to a
 * hardcoded default sourced from the debug probe (OriginId on todos).
 */
export async function getTeamMembers(token: string): Promise<TeamMember[]> {
  const meetingId = process.env.BLOOM_MEETING_ID ?? "215896";
  const data = await bloomFetch(token, endpoints.meetingAttendees(meetingId));
  return toArray(data)
    .map((raw) => {
      const owner = toOwner(raw);
      if (!owner) return null;
      const member: TeamMember = { id: owner.id, name: owner.name };
      if (owner.imageUrl) member.imageUrl = owner.imageUrl;
      return member;
    })
    .filter((m): m is TeamMember => m !== null);
}

/**
 * Resolve the URL of an item's notespad. Bloom stores notes/details in a
 * separate collaborative editor: the notes endpoint returns a { URL } that
 * renders the actual note content (the same pad shown inside Bloom). It's
 * meant to be embedded in an iframe — the URL carries its own access token —
 * so we hand the URL to the client rather than scraping it. Best-effort:
 * returns null on failure (milestones have no notes endpoint).
 */
export async function getItemNotesUrl(
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

  try {
    const res = await bloomFetch<{ URL?: string; url?: string }>(token, path);
    const url = res?.URL ?? res?.url ?? null;
    if (!url) return null;
    return /^https?:\/\//i.test(url)
      ? url
      : `${BLOOM_BASE_URL}/${url.replace(/^\//, "")}`;
  } catch {
    return null;
  }
}
