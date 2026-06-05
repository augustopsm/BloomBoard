// Higher-level data fetchers used by the API routes. Each returns normalized
// domain objects so route handlers stay thin.

import { bloomFetch } from "./client";
import { endpoints } from "./endpoints";
import {
  toArray,
  toIssue,
  toMilestone,
  toRock,
  toTodo,
} from "./transform";
import type { Issue, Milestone, Rock, Todo } from "./types";

export async function getRocks(token: string): Promise<Rock[]> {
  const data = await bloomFetch(token, endpoints.rocks);
  return toArray(data).map(toRock);
}

export async function getMilestones(token: string): Promise<Milestone[]> {
  const data = await bloomFetch(token, endpoints.milestones);
  return toArray(data).map(toMilestone);
}

export async function getTodos(token: string): Promise<Todo[]> {
  const data = await bloomFetch(token, endpoints.todos);
  return toArray(data).map(toTodo);
}

export async function getIssues(token: string): Promise<Issue[]> {
  const data = await bloomFetch(token, endpoints.issues);
  return toArray(data).map(toIssue);
}

/** Toggle a milestone's completion. Returns the updated milestone. */
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
