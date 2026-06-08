"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  colorForRock,
  formatDueDate,
  isOverdue,
  loadAsanaTasks,
  removeAsanaTask,
  saveAsanaTask,
  type BoardCard,
} from "@/lib/board";

type AsanaState = "idle" | "confirming" | "creating" | "done" | "error";

const TITLE_TAG: Record<BoardCard["kind"], string> = {
  milestone: "Milestone",
  todo: "To-Do",
  issue: "IDS",
};

export default function Card({
  card,
  groupName,
  dragging = false,
  onOpen,
  asanaEnabled = false,
}: {
  card: BoardCard;
  groupName: string;
  dragging?: boolean;
  onOpen?: () => void;
  asanaEnabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.uid });

  const stored = loadAsanaTasks()[card.uid] ?? null;
  const [asana, setAsana] = useState<AsanaState>(stored ? "done" : "idle");
  const [asanaUrl, setAsanaUrl] = useState<string | null>(stored?.url ?? null);

  // If a linked Asana task was deleted in Asana, reset so it can be recreated.
  useEffect(() => {
    const gid = stored?.gid;
    if (!gid) return;
    let cancelled = false;
    fetch(`/api/asana/task/${gid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || d.exists !== false) return;
        removeAsanaTask(card.uid);
        setAsana("idle");
        setAsanaUrl(null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.gid, card.uid]);

  const due = formatDueDate(card.dueDate);
  const overdue = isOverdue(card);
  const accent = colorForRock(card.rockId);

  async function confirmCreate() {
    setAsana("creating");
    try {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          kind: card.kind,
          name: card.name,
          rockName: card.kind === "milestone" ? groupName : null,
          meeting: card.meeting ?? null,
          ownerName: card.owner?.name ?? null,
          dueDate: card.dueDate,
          bloomUrl: card.detailsUrl ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const url = typeof data.url === "string" && data.url ? data.url : null;
      const gid = typeof data.gid === "string" && data.gid ? data.gid : null;
      if (gid) saveAsanaTask(card.uid, { gid, url: url ?? "" });
      setAsanaUrl(url);
      setAsana("done");
    } catch {
      setAsana("error");
      setTimeout(() => setAsana("idle"), 2500);
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={onOpen}
        style={{ transform: CSS.Translate.toString(transform) }}
        className={`group cursor-grab touch-none rounded-lg border bg-surface p-3 transition-all active:cursor-grabbing ${
          dragging
            ? "rotate-1 border-bloom/30 shadow-2xl shadow-black/60 ring-1 ring-bloom/20"
            : "border-white/[0.07] hover:border-white/[0.12] hover:bg-surface-hover"
        } ${isDragging && !dragging ? "opacity-30" : ""}`}
      >
        <div className="mb-2 flex items-start gap-2">
          <span
            className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p
            className={`text-[13px] leading-snug ${
              card.complete ? "text-zinc-600 line-through" : "text-zinc-200"
            }`}
          >
            {card.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pl-4 text-[11px]">
          {card.kind === "todo" ? (
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-medium text-cyan-400">
              To-Do
            </span>
          ) : card.kind === "issue" ? (
            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-medium text-violet-400">
              Issue
            </span>
          ) : (
            <span
              className="cursor-default rounded bg-orange-500/10 px-1.5 py-0.5 font-medium text-orange-400"
              title={groupName}
            >
              Milestone
            </span>
          )}

          {due && (
            <span
              className={`ml-auto rounded px-1.5 py-0.5 font-medium ${
                overdue
                  ? "bg-rose-500/10 text-rose-400"
                  : "bg-white/[0.04] text-zinc-600"
              }`}
            >
              {overdue ? "Overdue · " : ""}
              {due}
            </span>
          )}
        </div>

        {(card.owner || (asanaEnabled && !dragging)) && (
          <div className="mt-2 flex items-center gap-1.5 pl-4">
            {card.owner && (
              <>
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-300">
                  {initials(card.owner.name)}
                </span>
                <span className="truncate text-[11px] text-zinc-600">
                  {card.owner.name}
                </span>
              </>
            )}

            {!dragging && asanaEnabled && (
              <AsanaButton
                state={asana}
                url={asanaUrl}
                onRequestCreate={(e) => {
                  e.stopPropagation();
                  setAsana("confirming");
                }}
                onPointerDownCapture={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}
      </div>

      {asana === "confirming" &&
        createPortal(
          <AsanaConfirmModal
            card={card}
            groupName={groupName}
            onConfirm={confirmCreate}
            onCancel={() => setAsana("idle")}
          />,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Confirmation modal
// ---------------------------------------------------------------------------

function AsanaConfirmModal({
  card,
  groupName,
  onConfirm,
  onCancel,
}: {
  card: BoardCard;
  groupName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [project, setProject] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    fetch("/api/asana/project")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.name) setProject({ name: d.name, url: d.url ?? "" }); })
      .catch(() => {});
  }, []);

  const titleTag = TITLE_TAG[card.kind];
  const taskTitle = `[${titleTag}] ${card.name}`;
  const due = formatDueDate(card.dueDate);

  const rows: { label: string; value: string; url?: string }[] = [
    {
      label: "Type",
      value:
        card.kind === "milestone"
          ? "Milestone"
          : card.kind === "issue"
            ? "IDS Issue"
            : "To-Do",
    },
  ];
  if (card.kind === "milestone" && groupName) rows.push({ label: "Rock", value: groupName });
  if (card.meeting) rows.push({ label: "Meeting", value: card.meeting });
  if (card.owner) rows.push({ label: "Owner", value: card.owner.name });
  if (due) rows.push({ label: "Due", value: due });
  rows.push({ label: "Board", value: project?.name ?? "Loading…", url: project?.url });
  rows.push({ label: "Landing in", value: "Backlog" });
  rows.push({ label: "Source", value: "Bloom Growth" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#18181b] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-2">
          <AsanaLogo />
          <h2 className="text-sm font-semibold text-zinc-100">Create Asana Task</h2>
        </div>

        {/* Task title preview */}
        <div className="mb-4 rounded-lg border border-white/[0.07] bg-[#0f0f11] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 mb-1">Title</p>
          <p className="text-[13px] text-zinc-200 leading-snug">{taskTitle}</p>
        </div>

        {/* Meta rows */}
        <div className="mb-6 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3 text-[12px]">
              <span className="w-20 shrink-0 text-zinc-500">{r.label}</span>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-100"
                >
                  {r.value}
                </a>
              ) : (
                <span className="text-zinc-300">{r.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.07] px-4 py-1.5 text-[13px] text-zinc-400 transition hover:bg-white/[0.05] hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[#f06a35] px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#e05a25]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asana button
// ---------------------------------------------------------------------------

function AsanaButton({
  state,
  url,
  onRequestCreate,
  onPointerDownCapture,
}: {
  state: AsanaState;
  url: string | null;
  onRequestCreate: (e: React.MouseEvent) => void;
  onPointerDownCapture: (e: React.PointerEvent) => void;
}) {
  const base =
    "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium transition";

  if (state === "done") {
    const label = "✓ Asana";
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={onPointerDownCapture}
        className={`${base} bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`}
      >
        {label}
      </a>
    ) : (
      <span className={`${base} bg-emerald-500/10 text-emerald-400`}>{label}</span>
    );
  }

  return (
    <button
      onClick={onRequestCreate}
      onPointerDownCapture={onPointerDownCapture}
      disabled={state === "creating"}
      title="Create an Asana task from this card"
      className={`${base} ${
        state === "error"
          ? "bg-rose-500/10 text-rose-400"
          : state === "creating"
            ? "cursor-wait bg-white/[0.06] text-zinc-500"
            : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-100"
      }`}
    >
      {state === "creating"
        ? "Creating…"
        : state === "error"
          ? "Retry"
          : "+ Asana"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Asana wordmark icon (SVG)
// ---------------------------------------------------------------------------

function AsanaLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="10" r="6" fill="#f06a35" />
      <circle cx="6" cy="22" r="6" fill="#f06a35" />
      <circle cx="26" cy="22" r="6" fill="#f06a35" />
    </svg>
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
