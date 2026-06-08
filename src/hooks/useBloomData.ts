"use client";

import useSWR from "swr";
import type { Issue, Milestone, Rock, TeamMember, Todo } from "@/lib/bloom/types";

export interface BoardData {
  rocks: Rock[];
  milestones: Milestone[];
  todos: Todo[];
  issues: Issue[];
  asanaEnabled: boolean;
}

async function fetchBoard(url: string): Promise<BoardData> {
  const res = await fetch(url);
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Not authenticated.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed.");
  }
  return res.json();
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Not authenticated.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed.");
  }
  return res.json();
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mergeBoards(boards: BoardData[]): BoardData {
  return {
    rocks: dedupeById(boards.flatMap((b) => b.rocks)),
    milestones: dedupeById(boards.flatMap((b) => b.milestones)),
    todos: dedupeById(boards.flatMap((b) => b.todos)),
    issues: dedupeById(boards.flatMap((b) => b.issues)),
    asanaEnabled: boards.some((b) => b.asanaEnabled),
  };
}

/**
 * Load board data for the given user IDs.
 * - Empty array → load the current user's own board (default).
 * - Non-empty array → load ONLY those users' boards and merge them.
 *   The current user is not auto-included; add their ID to the list to
 *   include their items.
 */
export function useBoard(selectedUserIds: string[] = []) {
  const sorted = [...selectedUserIds].sort();
  // Use a stable SWR key: ["mine"] or ["users", id1, id2, ...]
  const key = sorted.length === 0 ? ["mine"] : ["users", ...sorted];

  return useSWR<BoardData>(key, async () => {
    const urls =
      sorted.length === 0
        ? ["/api/board"]
        : sorted.map((id) => `/api/board?userId=${encodeURIComponent(id)}`);
    const boards = await Promise.all(urls.map(fetchBoard));
    return mergeBoards(boards);
  });
}

export function useTeam() {
  return useSWR<TeamMember[]>("/api/team", fetcher);
}
