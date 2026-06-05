"use client";

import { useMemo } from "react";
import {
  colorForRock,
  ISSUE_GROUP_ID,
  TODO_GROUP_ID,
  type BoardCard,
} from "@/lib/board";
import type { Rock } from "@/lib/bloom/types";

export default function RockFilter({
  rocks,
  cards,
  activeRockIds,
  onChange,
  onOpenRock,
}: {
  rocks: Rock[];
  cards: BoardCard[];
  activeRockIds: Set<string> | null;
  onChange: (ids: Set<string> | null) => void;
  onOpenRock: (rock: Rock) => void;
}) {
  const isSynthetic = (id: string) =>
    id === TODO_GROUP_ID || id === ISSUE_GROUP_ID;
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cards) {
      const key = c.rockId ?? "__none__";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [cards]);

  const hasUnassigned = (counts.get("__none__") ?? 0) > 0;

  function toggle(id: string) {
    const next = new Set(activeRockIds ?? rocks.map((r) => r.id).concat(hasUnassigned ? ["__none__"] : []));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  const isActive = (id: string) => activeRockIds === null || activeRockIds.has(id);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#111113] md:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
          Groups
        </h2>
        <button
          onClick={() => onChange(null)}
          className="text-[11px] font-medium text-bloom/80 transition hover:text-bloom"
        >
          All
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        {rocks.length === 0 && (
          <p className="px-2 text-xs text-zinc-600">No rocks loaded.</p>
        )}
        {rocks.map((rock) => (
          <div
            key={rock.id}
            className={`group mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition ${
              isActive(rock.id)
                ? "bg-white/[0.05] text-zinc-200"
                : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-400"
            }`}
          >
            <button
              onClick={() => toggle(rock.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full opacity-90"
                style={{ backgroundColor: colorForRock(rock.id) }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]" title={rock.name}>
                {rock.name}
              </span>
            </button>
            {!isSynthetic(rock.id) && (
              <button
                onClick={() => onOpenRock(rock)}
                aria-label="View details"
                className="hidden shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-200 group-hover:block"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 7.2v3.3M8 5.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">
              {counts.get(rock.id) ?? 0}
            </span>
          </div>
        ))}

        {hasUnassigned && (
          <button
            onClick={() => toggle("__none__")}
            className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition ${
              isActive("__none__")
                ? "bg-white/[0.05] text-zinc-200"
                : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-400"
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full opacity-90"
              style={{ backgroundColor: colorForRock(null) }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px]">Unassigned</span>
            <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">
              {counts.get("__none__")}
            </span>
          </button>
        )}
      </div>

      <p className="border-t border-white/[0.05] px-4 py-3 text-[11px] leading-relaxed text-zinc-700">
        Drag to <span className="text-zinc-500">Complete</span> to mark done in Bloom.
      </p>
    </aside>
  );
}
