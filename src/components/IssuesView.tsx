"use client";

import type { Issue } from "@/lib/bloom/types";

export default function IssuesView({
  issues,
  onToggle,
  onOpen,
}: {
  issues: Issue[];
  onToggle: (id: string, complete: boolean) => void;
  onOpen: (issue: Issue) => void;
}) {
  const open = issues.filter((i) => !i.complete);
  const solved = issues.filter((i) => i.complete);

  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <IssueColumn
        title="Open"
        count={open.length}
        issues={open}
        emptyText="No open issues"
        accentClass="bg-zinc-800 text-zinc-400"
        actionLabel="Solve"
        onAction={(id) => onToggle(id, true)}
        onOpen={onOpen}
      />
      <IssueColumn
        title="Solved"
        count={solved.length}
        issues={solved}
        emptyText="Nothing solved yet"
        accentClass="bg-emerald-500/10 text-emerald-400"
        actionLabel="Reopen"
        onAction={(id) => onToggle(id, false)}
        onOpen={onOpen}
      />
    </div>
  );
}

function IssueColumn({
  title,
  count,
  issues,
  emptyText,
  accentClass,
  actionLabel,
  onAction,
  onOpen,
}: {
  title: string;
  count: number;
  issues: Issue[];
  emptyText: string;
  accentClass: string;
  actionLabel: string;
  onAction: (id: string) => void;
  onOpen: (issue: Issue) => void;
}) {
  return (
    <div className="flex w-[420px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${accentClass}`}>
          {title}
        </span>
        <span className="text-[11px] tabular-nums text-zinc-600">{count}</span>
      </div>

      <div className="scrollbar-thin flex flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
        {issues.length === 0 && (
          <p className="px-2 py-8 text-center text-[11px] text-zinc-700">
            {emptyText}
          </p>
        )}
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            actionLabel={actionLabel}
            onAction={() => onAction(issue.id)}
            onOpen={() => onOpen(issue)}
          />
        ))}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  actionLabel,
  onAction,
  onOpen,
}: {
  issue: Issue;
  actionLabel: string;
  onAction: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-surface px-3 py-2.5 transition hover:border-white/[0.12] hover:bg-surface-hover"
    >
      <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-violet-500/70" />

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] leading-snug ${
            issue.complete ? "text-zinc-600 line-through" : "text-zinc-200"
          }`}
        >
          {issue.name}
        </p>
        {issue.owner && (
          <p className="mt-0.5 text-[11px] text-zinc-600">{issue.owner.name}</p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
        className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-zinc-300"
      >
        {actionLabel}
      </button>
    </div>
  );
}
