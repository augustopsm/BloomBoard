"use client";

import { useMemo, useState } from "react";
import { columnFor, isOverdue, type BoardCard, type ColumnId } from "@/lib/board";

const COLUMNS: { id: ColumnId; label: string; color: string }[] = [
  { id: "todo",        label: "To Do",       color: "bg-zinc-500" },
  { id: "in-progress", label: "In Progress", color: "bg-blue-400" },
  { id: "blocked",     label: "Blocked",     color: "bg-amber-400" },
  { id: "complete",    label: "Complete",    color: "bg-emerald-400" },
];

const KINDS: { id: BoardCard["kind"]; label: string; color: string }[] = [
  { id: "milestone", label: "Milestones", color: "bg-orange-400" },
  { id: "todo",      label: "To-Dos",     color: "bg-cyan-400" },
  { id: "issue",     label: "Issues",     color: "bg-violet-400" },
];

export default function KPIDrawer({
  cards,
  overlay,
}: {
  cards: BoardCard[];
  overlay: Record<string, ColumnId>;
}) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const total = cards.length;
    const byColumn = Object.fromEntries(
      COLUMNS.map((c) => [c.id, cards.filter((card) => columnFor(card, overlay) === c.id).length]),
    ) as Record<ColumnId, number>;
    const byKind = Object.fromEntries(
      KINDS.map((k) => [k.id, cards.filter((c) => c.kind === k.id).length]),
    ) as Record<BoardCard["kind"], number>;
    const overdue = cards.filter((c) => isOverdue(c)).length;
    const completionPct = total > 0 ? Math.round((byColumn.complete / total) * 100) : 0;

    return { total, byColumn, byKind, overdue, completionPct };
  }, [cards, overlay]);

  return (
    <div className="relative flex h-full shrink-0">
      {/* Expanded drawer */}
      <div
        className={`flex h-full flex-col border-l border-white/[0.07] bg-[#151517] transition-all duration-300 ${
          open ? "w-72 opacity-100" : "w-0 overflow-hidden opacity-0"
        }`}
      >
        {open && (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <ChartIcon />
                <span className="text-[13px] font-semibold text-zinc-200">Board KPIs</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Total items" value={stats.total} />
                <StatCard label="Complete" value={`${stats.completionPct}%`} highlight={stats.completionPct >= 50} />
                <StatCard label="Overdue" value={stats.overdue} warn={stats.overdue > 0} />
                <StatCard label="Blocked" value={stats.byColumn.blocked} warn={stats.byColumn.blocked > 0} />
              </div>

              {/* By column */}
              <Section title="By Column">
                {COLUMNS.map((col) => (
                  <BarRow
                    key={col.id}
                    label={col.label}
                    value={stats.byColumn[col.id]}
                    total={stats.total}
                    color={col.color}
                  />
                ))}
              </Section>

              {/* By type */}
              <Section title="By Type">
                {KINDS.map((k) => (
                  <BarRow
                    key={k.id}
                    label={k.label}
                    value={stats.byKind[k.id]}
                    total={stats.total}
                    color={k.color}
                  />
                ))}
              </Section>

            </div>
          </>
        )}
      </div>

      {/* Collapsed tab */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close KPIs" : "Open KPIs"}
        className="flex h-full w-9 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-white/[0.07] bg-[#151517] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
      >
        <ChartIcon />
        <span
          className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.18em" }}
        >
          KPIs
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          className={`mt-1 transition-transform duration-300 ${open ? "rotate-0" : "rotate-180"}`}
        >
          <path d="M12 10L8 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatCard({ label, value, highlight, warn }: {
  label: string;
  value: number | string;
  highlight?: boolean;
  warn?: boolean;
}) {
  const valueColor = warn ? "text-amber-400" : highlight ? "text-emerald-400" : "text-zinc-100";
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] text-zinc-600 mb-0.5">{label}</p>
      <p className={`text-[22px] font-semibold leading-none ${valueColor}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500">{value} <span className="text-zinc-700">· {pct}%</span></span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${color} opacity-70 transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 12l4-4 3 3 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
