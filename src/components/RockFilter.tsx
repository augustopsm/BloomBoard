"use client";

import { useMemo } from "react";
import { colorForRock, type BoardCard } from "@/lib/board";
import type { Rock } from "@/lib/bloom/types";

export default function RockFilter({
  rocks,
  cards,
  activeRockIds,
  onChange,
}: {
  rocks: Rock[];
  cards: BoardCard[];
  activeRockIds: Set<string> | null;
  onChange: (ids: Set<string> | null) => void;
}) {
  // Count cards per group, including an "unassigned" bucket.
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
    // If everything is selected, treat as "no filter" (null) for clarity.
    onChange(next);
  }

  const isActive = (id: string) => activeRockIds === null || activeRockIds.has(id);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Rocks
        </h2>
        <button
          onClick={() => onChange(null)}
          className="text-xs font-medium text-bloom hover:underline"
        >
          Show all
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        {rocks.length === 0 && (
          <p className="px-2 text-xs text-slate-400">No rocks loaded.</p>
        )}
        {rocks.map((rock) => (
          <button
            key={rock.id}
            onClick={() => toggle(rock.id)}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
              isActive(rock.id)
                ? "bg-slate-50 text-slate-900"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorForRock(rock.id) }}
            />
            <span className="min-w-0 flex-1 truncate" title={rock.name}>
              {rock.name}
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              {counts.get(rock.id) ?? 0}
            </span>
          </button>
        ))}

        {hasUnassigned && (
          <button
            onClick={() => toggle("__none__")}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
              isActive("__none__")
                ? "bg-slate-50 text-slate-900"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorForRock(null) }}
            />
            <span className="min-w-0 flex-1 truncate">Unassigned</span>
            <span className="shrink-0 text-xs text-slate-400">
              {counts.get("__none__")}
            </span>
          </button>
        )}
      </div>

      <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
        Cards are milestones (colored by their Rock) and standalone to-dos.
        Drag a card to <strong>Complete</strong> to mark it done in Bloom.
      </p>
    </aside>
  );
}
