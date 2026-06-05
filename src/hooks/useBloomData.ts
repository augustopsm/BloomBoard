"use client";

import useSWR from "swr";
import type { Milestone, Rock } from "@/lib/bloom/types";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) {
    // Session expired or missing — bounce to login.
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Not authenticated.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed.");
  }
  return res.json();
}

/**
 * Rocks and their nested milestones in a single request — the board's primary
 * data source.
 */
export function useBoard() {
  return useSWR<{ rocks: Rock[]; milestones: Milestone[] }>(
    "/api/board",
    fetcher,
  );
}
