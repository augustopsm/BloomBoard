"use client";

"use client";

import useSWR from "swr";
import type { Issue, Milestone, Rock, Todo } from "@/lib/bloom/types";

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

export function useBoard() {
  return useSWR<{
    rocks: Rock[];
    milestones: Milestone[];
    todos: Todo[];
    issues: Issue[];
  }>("/api/board", fetcher);
}
