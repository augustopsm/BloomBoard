// Defensive mappers from raw Bloom Growth payloads → normalized domain types.
//
// Bloom's API has historically used PascalCase (it's an ASP.NET backend), but
// some routes return camelCase. Rather than guess, every getter below checks a
// few likely key spellings and falls back gracefully. This keeps the UI stable
// even if a field name shifts.

import { BLOOM_BASE_URL } from "./endpoints";
import type {
  Issue,
  Milestone,
  Owner,
  Rock,
  RockStatus,
  Todo,
} from "./types";

type Raw = Record<string, unknown>;

/** Normalize Bloom's `DetailsUrl` (often relative) into an absolute link. */
function toDetailsUrl(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `${BLOOM_BASE_URL}/${s.replace(/^\//, "")}`;
}

/** Bloom `Origins` is an array of { Name, Id }; pull out the names. */
function toMeetingNames(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((o) => (o && typeof o === "object" ? asString((o as Raw).Name) : undefined))
    .filter((n): n is string => Boolean(n));
}

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
  if (asBool(pick(raw, "Complete", "complete", "Completed"))) return "complete";

  // Rocks carry a numeric `Completion` enum (verified: 2 === complete on a
  // Complete:true rock). Treat it as a status code, not a percentage. The
  // 0/1 mapping below is a best guess for off-track/on-track until confirmed
  // on a non-complete rock — it only affects sidebar coloring, not the board.
  const completion = pick(raw, "Completion", "completion");
  if (completion !== undefined) {
    const n = Number(completion);
    if (n >= 2) return "complete";
    if (n === 1) return "on-track";
    if (n === 0) return "off-track";
  }

  // Fall back to a string status if present (e.g. "OnTrack"/"OffTrack").
  const status = asString(pick(raw, "Status", "status"))?.toLowerCase();
  if (status?.includes("off")) return "off-track";
  if (status?.includes("on")) return "on-track";
  if (status?.includes("done") || status?.includes("complete")) return "complete";
  return "incomplete";
}

export function toRock(raw: Raw): Rock {
  const status = toRockStatus(raw);
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    status,
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
    // Real progress % is derived from milestone completion in service.ts; this
    // is just a sensible default for rocks with no milestones.
    completion: status === "complete" ? 100 : 0,
    createdAt: asIsoDate(pick(raw, "CreateTime", "createTime", "CreatedAt")),
    meetings: toMeetingNames(pick(raw, "Origins", "origins")),
    detailsUrl: toDetailsUrl(pick(raw, "DetailsUrl", "detailsUrl")),
  };
}

/**
 * Milestone completion is a string `Status` ("Done"). Anything that reads as
 * done/complete counts as complete; other values (e.g. "OnTrack") do not. A
 * `Complete`/`Done` boolean is honored too, for forward-compatibility.
 */
function milestoneComplete(raw: Raw): boolean {
  const status = asString(pick(raw, "Status", "status"))?.toLowerCase();
  if (status) return status.includes("done") || status.includes("complete");
  return asBool(pick(raw, "Complete", "complete", "Completed", "Done"));
}

export function toMilestone(raw: Raw): Milestone {
  return {
    id: asString(pick(raw, "Id", "id"))!,
    rockId: asString(pick(raw, "RockId", "rockId", "ParentId", "parentId")) ?? null,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    complete: milestoneComplete(raw),
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
    createdAt: asIsoDate(pick(raw, "CreateTime", "createTime", "CreatedAt")),
  };
}

export function toTodo(raw: Raw): Todo {
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    complete: asBool(pick(raw, "Complete", "complete", "Completed")),
    dueDate: asIsoDate(pick(raw, "DueDate", "dueDate", "Date")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
    context: asString(pick(raw, "ContextTitle", "contextTitle", "Context")) ?? null,
    createdAt: asIsoDate(pick(raw, "CreateTime", "createTime", "CreatedAt")),
    detailsUrl: toDetailsUrl(pick(raw, "DetailsUrl", "detailsUrl")),
  };
}

export function toIssue(raw: Raw): Issue {
  const priority = pick(raw, "Priority", "priority");
  return {
    id: asString(pick(raw, "Id", "id"))!,
    name: asString(pick(raw, "Name", "name", "Title", "title")) ?? "Untitled",
    description: asString(pick(raw, "Details", "details", "Description", "description")) ?? null,
    complete: asBool(pick(raw, "Complete", "complete", "Completed")),
    owner: toOwner(pick(raw, "Owner", "owner", "User", "user")),
    priority: priority === undefined || priority === null ? null : Number(priority),
    fromWhere: asString(pick(raw, "FromWhere", "fromWhere", "Origin", "origin")) ?? null,
    createdAt: asIsoDate(pick(raw, "CreateTime", "createTime", "CreatedAt")),
    detailsUrl: toDetailsUrl(pick(raw, "DetailsUrl", "detailsUrl")),
  };
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
