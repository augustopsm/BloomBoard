// Client-side Kanban model.
//
// Bloom Growth milestones only store a `complete` boolean (plus a due date), so
// a true multi-stage Kanban needs more states than the API natively tracks. We
// bridge that gap:
//
//   • The "Complete" column is authoritative — dragging here PATCHes the
//     milestone's `complete` flag in Bloom, and it syncs back to everyone.
//   • The "To Do / In Progress / Blocked" columns are a *local workflow
//     overlay* persisted in localStorage. They're a planning aid layered on
//     top of Bloom and never alter Bloom data (an incomplete milestone is
//     incomplete regardless of which of these lanes it sits in).
//
// This is intentional and documented in the README so the behavior isn't
// surprising.

import type { Milestone } from "./bloom/types";

export type ColumnId = "todo" | "in-progress" | "blocked" | "complete";

export interface ColumnDef {
  id: ColumnId;
  title: string;
  /** Tailwind accent classes for the column header. */
  accent: string;
  description: string;
}

export const COLUMNS: ColumnDef[] = [
  {
    id: "todo",
    title: "To Do",
    accent: "bg-slate-100 text-slate-600",
    description: "Planned, not started",
  },
  {
    id: "in-progress",
    title: "In Progress",
    accent: "bg-blue-100 text-blue-700",
    description: "Actively being worked",
  },
  {
    id: "blocked",
    title: "Blocked",
    accent: "bg-amber-100 text-amber-700",
    description: "Waiting / at risk",
  },
  {
    id: "complete",
    title: "Complete",
    accent: "bg-emerald-100 text-emerald-700",
    description: "Done in Bloom Growth",
  },
];

const OVERLAY_KEY = "bloomboard.stages.v1";

type StageOverlay = Record<string, ColumnId>;

export function loadOverlay(): StageOverlay {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(OVERLAY_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveOverlay(overlay: StageOverlay) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
}

/**
 * Resolve which column a milestone belongs in. Completion always wins;
 * otherwise fall back to the local overlay, defaulting to "To Do".
 */
export function columnFor(milestone: Milestone, overlay: StageOverlay): ColumnId {
  if (milestone.complete) return "complete";
  const stage = overlay[milestone.id];
  return stage && stage !== "complete" ? stage : "todo";
}

/** Deterministic accent color per rock id, for grouping cards visually. */
const ROCK_PALETTE = [
  "#5b3df5", // bloom purple
  "#0ea5e9", // sky
  "#f97316", // orange
  "#16a34a", // green
  "#e11d48", // rose
  "#9333ea", // violet
  "#0d9488", // teal
  "#ca8a04", // amber
];

export function colorForRock(rockId: string | null): string {
  if (!rockId) return "#94a3b8"; // slate for unassigned
  let hash = 0;
  for (let i = 0; i < rockId.length; i++) {
    hash = (hash * 31 + rockId.charCodeAt(i)) >>> 0;
  }
  return ROCK_PALETTE[hash % ROCK_PALETTE.length];
}

export function isOverdue(milestone: Milestone): boolean {
  if (milestone.complete || !milestone.dueDate) return false;
  return new Date(milestone.dueDate).getTime() < Date.now();
}

export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
