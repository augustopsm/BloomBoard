// Client-side Kanban model.
//
// The board shows two kinds of work as cards:
//   • Milestones — steps inside a Rock, grouped/colored by that Rock.
//   • To-Dos     — standalone action items with no Rock. They're collected
//                  under a synthetic "To-Dos" group that behaves like a Rock.
//
// Bloom only stores a completion flag (+ due date) per item, so a true
// multi-stage Kanban needs more states than the API tracks. We bridge that:
//
//   • The "Complete" column is authoritative — dragging here writes the
//     item's completion back to Bloom, and it syncs for everyone.
//   • "To Do / In Progress / Blocked" are a *local workflow overlay* persisted
//     in localStorage (keyed per card). They never alter Bloom data.

import type { Issue, Milestone, Owner, Todo } from "./bloom/types";

export type ColumnId = "todo" | "in-progress" | "blocked" | "complete";

export type CardKind = "milestone" | "todo" | "issue";

/** A unified card on the board — either a milestone or a standalone to-do. */
export interface BoardCard {
  /** Unique on the board, e.g. "todo:123" (ids can collide across kinds). */
  uid: string;
  /** The underlying Bloom id, used for completion writes. */
  id: string;
  kind: CardKind;
  name: string;
  complete: boolean;
  dueDate: string | null;
  owner: Owner | null;
  /** Milestones: parent rock id. To-Dos: the synthetic TODO_GROUP_ID. */
  rockId: string | null;
  // Detail fields surfaced in the detail drawer.
  context?: string | null;
  createdAt?: string | null;
  detailsUrl?: string | null;
}

/** Synthetic "rock" that gathers rock-less to-dos. */
export const TODO_GROUP_ID = "__todos__";
export const TODO_GROUP_NAME = "To-Dos";

/** Synthetic "rock" that gathers IDS issues. */
export const ISSUE_GROUP_ID = "__issues__";
export const ISSUE_GROUP_NAME = "Issues (IDS)";

export function milestoneToCard(m: Milestone): BoardCard {
  return {
    uid: `milestone:${m.id}`,
    id: m.id,
    kind: "milestone",
    name: m.name,
    complete: m.complete,
    dueDate: m.dueDate,
    owner: m.owner,
    rockId: m.rockId,
    createdAt: m.createdAt,
  };
}

export function todoToCard(t: Todo): BoardCard {
  return {
    uid: `todo:${t.id}`,
    id: t.id,
    kind: "todo",
    name: t.name,
    complete: t.complete,
    dueDate: t.dueDate,
    owner: t.owner,
    rockId: TODO_GROUP_ID,
    context: t.context,
    createdAt: t.createdAt,
    detailsUrl: t.detailsUrl,
  };
}

export function issueToCard(i: Issue): BoardCard {
  return {
    uid: `issue:${i.id}`,
    id: i.id,
    kind: "issue",
    name: i.name,
    complete: i.complete,
    dueDate: null,
    owner: i.owner,
    rockId: ISSUE_GROUP_ID,
  };
}

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
    accent: "bg-zinc-800 text-zinc-400",
    description: "Planned, not started",
  },
  {
    id: "in-progress",
    title: "In Progress",
    accent: "bg-blue-500/10 text-blue-400",
    description: "Actively being worked",
  },
  {
    id: "blocked",
    title: "Blocked",
    accent: "bg-amber-500/10 text-amber-400",
    description: "Waiting / at risk",
  },
  {
    id: "complete",
    title: "Complete",
    accent: "bg-emerald-500/10 text-emerald-400",
    description: "Done in Bloom Growth",
  },
];

// Bumped to v2 when cards became (milestone | todo) and the overlay key
// switched from milestone id to the card uid.
const OVERLAY_KEY = "bloomboard.stages.v2";

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
 * Resolve which column a card belongs in. Completion always wins; otherwise
 * fall back to the local overlay, defaulting to "To Do".
 */
export function columnFor(card: BoardCard, overlay: StageOverlay): ColumnId {
  if (card.complete) return "complete";
  const stage = overlay[card.uid];
  return stage && stage !== "complete" ? stage : "todo";
}

/** Deterministic accent color per group id, for grouping cards visually. */
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
  if (rockId === TODO_GROUP_ID) return "#0891b2"; // fixed cyan for to-dos
  if (rockId === ISSUE_GROUP_ID) return "#7c3aed"; // violet for issues
  let hash = 0;
  for (let i = 0; i < rockId.length; i++) {
    hash = (hash * 31 + rockId.charCodeAt(i)) >>> 0;
  }
  return ROCK_PALETTE[hash % ROCK_PALETTE.length];
}

export function isOverdue(card: BoardCard): boolean {
  if (card.complete || !card.dueDate) return false;
  return new Date(card.dueDate).getTime() < Date.now();
}

export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
