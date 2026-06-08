"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  colorForRock,
  formatDueDate,
  isOverdue,
  type BoardCard,
} from "@/lib/board";

type AsanaState = "idle" | "creating" | "done" | "error";

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

  const [asana, setAsana] = useState<AsanaState>("idle");
  const [asanaUrl, setAsanaUrl] = useState<string | null>(null);

  const due = formatDueDate(card.dueDate);
  const overdue = isOverdue(card);
  const accent = colorForRock(card.rockId);

  async function createAsanaTask() {
    if (asana === "creating") return;
    setAsana("creating");
    try {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          kind: card.kind,
          name: card.name,
          // Rock name is only meaningful for milestones (todos/issues use a
          // synthetic group name we don't want to send as a rock).
          rockName: card.kind === "milestone" ? groupName : null,
          meeting: card.meeting ?? null,
          ownerName: card.owner?.name ?? null,
          dueDate: card.dueDate,
          bloomUrl: card.detailsUrl ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAsanaUrl(typeof data.url === "string" && data.url ? data.url : null);
      setAsana("done");
    } catch {
      setAsana("error");
      setTimeout(() => setAsana("idle"), 2500);
    }
  }

  return (
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
            onCreate={(e) => {
              e.stopPropagation();
              createAsanaTask();
            }}
            onPointerDownCapture={(e) => e.stopPropagation()}
          />
        )}
      </div>
      )}
    </div>
  );
}

function AsanaButton({
  state,
  url,
  onCreate,
  onPointerDownCapture,
}: {
  state: AsanaState;
  url: string | null;
  onCreate: (e: React.MouseEvent) => void;
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
      onClick={onCreate}
      onPointerDownCapture={onPointerDownCapture}
      disabled={state === "creating"}
      title="Create an Asana task from this card"
      className={`${base} ${
        state === "error"
          ? "bg-rose-500/10 text-rose-400"
          : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-100"
      }`}
    >
      {state === "creating"
        ? "Sending…"
        : state === "error"
          ? "Retry"
          : "+ Asana"}
    </button>
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
