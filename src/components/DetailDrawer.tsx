"use client";

import { useEffect, useState } from "react";
import type { BoardCard, CardKind } from "@/lib/board";
import type { Issue, Owner, Rock } from "@/lib/bloom/types";

type DetailKind = "todo" | "issue" | "rock" | "milestone";

/** Normalized shape the drawer renders, regardless of source entity. */
export interface DetailItem {
  /** Underlying Bloom id, used to lazy-load notes/details. */
  id: string;
  /** Real entity kind for the details fetch (rocks aren't a CardKind). */
  detailKind: DetailKind;
  title: string;
  kind: CardKind;
  complete: boolean;
  owner: Owner | null;
  rows: { label: string; value: string }[];
  detailsUrl?: string | null;
}

const KIND_META: Record<CardKind, { label: string; className: string }> = {
  milestone: { label: "Milestone", className: "bg-zinc-700/40 text-zinc-300" },
  todo: { label: "To-Do", className: "bg-cyan-500/10 text-cyan-400" },
  issue: { label: "Issue", className: "bg-violet-500/10 text-violet-400" },
};

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function detailFromCard(card: BoardCard, groupName: string): DetailItem {
  const rows: DetailItem["rows"] = [];
  if (card.kind === "milestone") {
    rows.push({ label: "Rock", value: groupName });
  }
  if (card.context) rows.push({ label: "Context", value: card.context });
  const due = fmtDate(card.dueDate);
  if (due) rows.push({ label: "Due", value: due });
  const created = fmtDate(card.createdAt);
  if (created) rows.push({ label: "Created", value: created });
  rows.push({ label: "Status", value: card.complete ? "Complete" : "Open" });
  return {
    id: card.id,
    detailKind: card.kind,
    title: card.name,
    kind: card.kind,
    complete: card.complete,
    owner: card.owner,
    rows,
    detailsUrl: card.detailsUrl,
  };
}

export function detailFromIssue(issue: Issue): DetailItem {
  const rows: DetailItem["rows"] = [];
  if (issue.fromWhere) rows.push({ label: "From", value: issue.fromWhere });
  if (issue.priority !== null && issue.priority !== undefined) {
    rows.push({ label: "Priority", value: String(issue.priority) });
  }
  const created = fmtDate(issue.createdAt);
  if (created) rows.push({ label: "Created", value: created });
  rows.push({ label: "Status", value: issue.complete ? "Solved" : "Open" });
  return {
    id: issue.id,
    detailKind: "issue",
    title: issue.name,
    kind: "issue",
    complete: issue.complete,
    owner: issue.owner,
    rows,
    detailsUrl: issue.detailsUrl,
  };
}

export function detailFromRock(rock: Rock): DetailItem {
  const rows: DetailItem["rows"] = [];
  rows.push({ label: "Progress", value: `${rock.completion}%` });
  rows.push({ label: "Status", value: statusLabel(rock.status) });
  const due = fmtDate(rock.dueDate);
  if (due) rows.push({ label: "Due", value: due });
  const created = fmtDate(rock.createdAt);
  if (created) rows.push({ label: "Created", value: created });
  if (rock.meetings && rock.meetings.length > 0) {
    rows.push({ label: "Meetings", value: rock.meetings.join(", ") });
  }
  return {
    id: rock.id,
    detailKind: "rock",
    // Rocks aren't a card kind; reuse milestone styling for the neutral chip.
    title: rock.name,
    kind: "milestone",
    complete: rock.status === "complete",
    owner: rock.owner,
    rows,
    detailsUrl: rock.detailsUrl,
  };
}

function statusLabel(s: Rock["status"]): string {
  switch (s) {
    case "on-track":
      return "On track";
    case "off-track":
      return "Off track / At risk";
    case "complete":
      return "Complete";
    default:
      return "—";
  }
}

export default function DetailDrawer({
  item,
  kindLabelOverride,
  onClose,
}: {
  item: DetailItem | null;
  /** When set, replaces the kind chip label (e.g. "Rock"). */
  kindLabelOverride?: string;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<string | null>(null);
  const [detailsState, setDetailsState] = useState<"idle" | "loading" | "done">(
    "idle",
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (item) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  // Lazy-load notes/details whenever a new item opens.
  useEffect(() => {
    if (!item || item.detailKind === "milestone") {
      setDetails(null);
      setDetailsState("done");
      return;
    }
    let cancelled = false;
    setDetails(null);
    setDetailsState("loading");
    fetch(`/api/details/${item.detailKind}/${item.id}`)
      .then((r) => (r.ok ? r.json() : { details: null }))
      .then((d) => {
        if (cancelled) return;
        setDetails(typeof d.details === "string" ? d.details : null);
        setDetailsState("done");
      })
      .catch(() => {
        if (cancelled) return;
        setDetailsState("done");
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;
  const meta = KIND_META[item.kind];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />

      {/* Panel */}
      <aside className="relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-white/[0.08] bg-[#151517] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${meta.className}`}
          >
            {kindLabelOverride ?? meta.label}
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">
          <h2
            className={`text-lg font-semibold leading-snug ${
              item.complete ? "text-zinc-500 line-through" : "text-zinc-100"
            }`}
          >
            {item.title}
          </h2>

          {item.owner && (
            <div className="mt-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-300">
                {initials(item.owner.name)}
              </span>
              <span className="text-sm text-zinc-400">{item.owner.name}</span>
            </div>
          )}

          <dl className="mt-6 space-y-3">
            {item.rows.map((row) => (
              <div key={row.label} className="flex gap-4">
                <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-600">
                  {row.label}
                </dt>
                <dd className="flex-1 whitespace-pre-wrap text-[13px] text-zinc-300">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {item.detailKind !== "milestone" && (
            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-600">
                Details
              </p>
              {detailsState === "loading" ? (
                <p className="text-[13px] text-zinc-600">Loading notes…</p>
              ) : details ? (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                  {details}
                </p>
              ) : (
                <p className="text-[13px] text-zinc-600">
                  No notes for this item.
                </p>
              )}
            </div>
          )}
        </div>

        {item.detailsUrl && (
          <div className="border-t border-white/[0.06] px-5 py-4">
            <a
              href={item.detailsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-bloom px-4 py-2 text-sm font-semibold text-white transition hover:bg-bloom-dark"
            >
              Open in Bloom
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3h7v7M13 3L5 11M3 7v6h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
