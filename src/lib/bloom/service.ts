// Higher-level data fetchers used by the API routes. Each returns normalized
// domain objects so route handlers stay thin.

import { bloomFetch } from "./client";
import { endpoints } from "./endpoints";
import { toArray, toIssue, toMilestone, toRock, toTodo } from "./transform";
import type { Issue, Milestone, Rock, Todo } from "./types";

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
  return toArray(data).map(toTodo);
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
