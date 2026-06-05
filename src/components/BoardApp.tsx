"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import Header from "./Header";
import RockFilter from "./RockFilter";
import { useMilestones, useRocks } from "@/hooks/useBloomData";
import {
  columnFor,
  loadOverlay,
  saveOverlay,
  type ColumnId,
} from "@/lib/board";
import type { Milestone, Rock } from "@/lib/bloom/types";

export default function BoardApp({ userName }: { userName: string }) {
  const { data: rocksData, error: rocksError, isLoading: rocksLoading } = useRocks();
  const {
    data: msData,
    error: msError,
    isLoading: msLoading,
    mutate: mutateMilestones,
  } = useMilestones();

  const [overlay, setOverlay] = useState<Record<string, ColumnId>>({});
  const [activeRockIds, setActiveRockIds] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");

  // Hydrate the local stage overlay once on mount.
  useEffect(() => setOverlay(loadOverlay()), []);

  const rocks: Rock[] = useMemo(() => rocksData?.rocks ?? [], [rocksData]);
  const milestones: Milestone[] = useMemo(
    () => msData?.milestones ?? [],
    [msData],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return milestones.filter((m) => {
      if (activeRockIds && !activeRockIds.has(m.rockId ?? "__none__")) {
        return false;
      }
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [milestones, activeRockIds, query]);

  /** Move a milestone to a column — sync completion to Bloom, persist overlay. */
  async function moveTo(milestone: Milestone, target: ColumnId) {
    const current = columnFor(milestone, overlay);
    if (current === target) return;

    // Update the local overlay immediately for snappy UX.
    const nextOverlay = { ...overlay, [milestone.id]: target };
    setOverlay(nextOverlay);
    saveOverlay(nextOverlay);

    const shouldComplete = target === "complete";
    if (shouldComplete !== milestone.complete) {
      // Optimistically reflect completion in the SWR cache.
      mutateMilestones(
        (prev) =>
          prev && {
            milestones: prev.milestones.map((m) =>
              m.id === milestone.id ? { ...m, complete: shouldComplete } : m,
            ),
          },
        { revalidate: false },
      );

      try {
        const res = await fetch(`/api/milestones/${milestone.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complete: shouldComplete }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Roll back on failure.
        mutateMilestones();
        const reverted = { ...nextOverlay, [milestone.id]: current };
        setOverlay(reverted);
        saveOverlay(reverted);
      }
    }
  }

  const loading = rocksLoading || msLoading;
  const error = rocksError || msError;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header userName={userName} query={query} onQueryChange={setQuery} />

      <div className="flex min-h-0 flex-1">
        <RockFilter
          rocks={rocks}
          milestones={milestones}
          activeRockIds={activeRockIds}
          onChange={setActiveRockIds}
        />

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : loading ? (
            <LoadingState />
          ) : milestones.length === 0 ? (
            <EmptyState />
          ) : (
            <Board
              milestones={filtered}
              rocks={rocks}
              overlay={overlay}
              onMove={moveTo}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      Loading your milestones from Bloom Growth…
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="text-3xl">🌱</span>
      <p className="text-sm text-slate-500">
        No milestones found. Add milestones to your Rocks in Bloom Growth and
        they&apos;ll appear here.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="max-w-md text-sm text-rose-600">{message}</p>
      <p className="max-w-md text-xs text-slate-400">
        If this is a 404, the Bloom API path may differ for your account —
        adjust <code>src/lib/bloom/endpoints.ts</code>.
      </p>
    </div>
  );
}
