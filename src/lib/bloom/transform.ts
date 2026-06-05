// Defensive mappers from raw Bloom Growth payloads → normalized domain types.
//
// Bloom's API has historically used PascalCase (it's an ASP.NET backend), but
// some routes return camelCase. Rather than guess, every getter below checks a
// few likely key spellings and falls back gracefully. This keeps the UI stable
// even if a field name shifts.

import type {
  Issue,
  Milestone,
  Owner,
  Rock,
  RockStatus,
  Todo,
} from "./types";

type Raw = Record<string, unknown>;

/** Pick the first defined value across a list of candidate keys. */
function pick<T = unknown>(obj: Raw, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return Boolean(v);
}

function asIsoDate(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toOwner(raw: unknown): Owner | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Raw;
  const id = asString(pick(o, "Id", "id", "UserId", "userId"));
  if (!id) return null;
  const name =
    asString(pick(o, "Name", "name")) ??
    [pick(o, "FirstName", "firstName"), pick(o, "LastName", "lastName")]
      .filter(Boolean)
      .join(" ")
      .trim();
  return {
    id,
    name: name || "Unassigned",
    imageUrl: asString(pick(o, "ImageUrl", "imageUrl", "PictureUrl")),
  };
}

function toRockStatus(raw: Raw): RockStatus {
  const complete = asBool(pick(raw, "Complete", "complete", "Completed"));
  if (complete) return "complete";
  // Bloom encodes status a few ways: a string, or an "onTrack" boolean.
  const status = asString(pick(raw, "Status", "status"))?.toLowerCase();
  if (status?.includes("off")) return "off-track";
  if (status?.includes("on")) return "on-track";
  const onTrack = pick(raw, "OnTrack", "onTrack");
  if (onTrack !== undefined) return asBool(onTrack) ? "on-track" : "off-track";
  return "incomplete";
}

export function toRock(raw: Raw): Rock {
  const completionRaw = pick<number | string>(
    raw,
    "Completion",
    "completion",
    "PercentComplete",
    "percentComplete",
  );
  const completion =
    completionRaw !== undefined ? Math.round(Number(completionRaw)) : 0;
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    status: toRockStatus(raw),
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
    completion: Number.isFinite(completion) ? completion : 0,
  };
}

export function toMilestone(raw: Raw): Milestone {
  return {
    id: asString(pick(raw, "Id", "id"))!,
    rockId: asString(pick(raw, "RockId", "rockId", "ParentId", "parentId")) ?? null,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    complete: asBool(pick(raw, "Complete", "complete", "Completed", "Done")),
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
  };
}

export function toTodo(raw: Raw): Todo {
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    complete: asBool(pick(raw, "Complete", "complete", "Completed")),
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
  };
}

export function toIssue(raw: Raw): Issue {
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    description: asString(pick(raw, "Details", "details", "Description", "description")) ?? null,
    complete: asBool(pick(raw, "Complete", "complete", "Completed")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
  };
}

/**
 * Pull the milestones embedded in a raw rock payload, stamping each with its
 * parent rock's id (embedded milestones often omit their own RockId).
 */
export function extractMilestones(rawRock: Raw): Milestone[] {
  const rockId = asString(pick(rawRock, "Id", "id")) ?? null;
  const list = pick(rawRock, "Milestones", "milestones");
  return toArray(list).map((m) => {
    const milestone = toMilestone(m);
    return { ...milestone, rockId: milestone.rockId ?? rockId };
  });
}

/** Bloom list endpoints sometimes wrap results in `{ items: [...] }`. */
export function toArray(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload as Raw[];
  if (payload && typeof payload === "object") {
    const wrapped = (payload as Raw).items ?? (payload as Raw).Items;
    if (Array.isArray(wrapped)) return wrapped as Raw[];
  }
  return [];
}
