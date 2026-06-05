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

export function useRocks() {
  return useSWR<{ rocks: Rock[] }>("/api/rocks", fetcher);
}

export function useMilestones() {
  return useSWR<{ milestones: Milestone[] }>("/api/milestones", fetcher);
}
