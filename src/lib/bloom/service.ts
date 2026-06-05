// Higher-level data fetchers used by the API routes. Each returns normalized
// domain objects so route handlers stay thin.

import { bloomFetch } from "./client";
import { endpoints } from "./endpoints";
import {
  extractMilestones,
  toArray,
  toIssue,
  toRock,
  toTodo,
} from "./transform";
import type { Issue, Milestone, Rock, Todo } from "./types";

/**
 * Fetch the current user's rocks and the milestones nested inside them in a
 * single API call. Rock completion is derived from milestone progress when the
 * rock has milestones — that's the most meaningful signal for the board.
 */
export async function loadRocksAndMilestones(
  token: string,
): Promise<{ rocks: Rock[]; milestones: Milestone[] }> {
  const raw = toArray(await bloomFetch(token, endpoints.myRocks));
  const rocks: Rock[] = [];
  const milestones: Milestone[] = [];

  for (const rawRock of raw) {
    const rock = toRock(rawRock);
    const rockMilestones = extractMilestones(rawRock);
    if (rockMilestones.length > 0) {
      const done = rockMilestones.filter((m) => m.complete).length;
      rock.completion = Math.round((done / rockMilestones.length) * 100);
    }
    rocks.push(rock);
    milestones.push(...rockMilestones);
  }

  return { rocks, milestones };
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

/** Toggle a milestone's completion. */
export async function setMilestoneComplete(
  token: string,
  id: string,
  complete: boolean,
): Promise<void> {
  await bloomFetch(token, endpoints.milestone(id), {
    method: "PUT",
    body: JSON.stringify({ Complete: complete, complete }),
  });
}
