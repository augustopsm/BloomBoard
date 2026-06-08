"use client";

import { useEffect, useState } from "react";
import type { KPIMetric } from "@/app/api/kpis/route";

export default function KPIDrawer() {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!open || status !== "idle") return;
    setStatus("loading");
    fetch("/api/kpis")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMetrics(Array.isArray(data) ? data : []);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [open, status]);

  return (
    <div className="relative flex h-full shrink-0">
      {/* Expanded drawer panel */}
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
                <span className="text-[13px] font-semibold text-zinc-200">Current KPIs</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
                aria-label="Close KPIs"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {status === "loading" && (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
                  ))}
                </div>
              )}

              {status === "error" && (
                <p className="text-[12px] text-zinc-600">Could not load KPIs.</p>
              )}

              {status === "done" && metrics.length === 0 && (
                <p className="text-[12px] text-zinc-600">No scorecard metrics found.</p>
              )}

              {status === "done" && metrics.length > 0 && (
                <ul className="space-y-2">
                  {metrics.map((m) => (
                    <MetricRow key={m.id} metric={m} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collapsed tab — always visible */}
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

function MetricRow({ metric }: { metric: KPIMetric }) {
  const fmt = (n: number | null) => {
    if (n === null) return "—";
    return n.toLocaleString();
  };

  const trackColor =
    metric.onTrack === true
      ? "text-emerald-400"
      : metric.onTrack === false
        ? "text-rose-400"
        : "text-zinc-600";

  const trackLabel =
    metric.onTrack === true ? "On track" : metric.onTrack === false ? "Off track" : null;

  return (
    <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="mb-1.5 truncate text-[11px] font-medium text-zinc-400" title={metric.title}>
        {metric.title}
      </p>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[20px] font-semibold leading-none text-zinc-100">
          {fmt(metric.value)}
          {metric.unit && (
            <span className="ml-0.5 text-[11px] font-normal text-zinc-500">{metric.unit}</span>
          )}
        </span>
        {metric.goal !== null && (
          <span className="text-[10px] text-zinc-600">
            Goal: {fmt(metric.goal)}
          </span>
        )}
      </div>
      {trackLabel && (
        <p className={`mt-1 text-[10px] font-medium ${trackColor}`}>{trackLabel}</p>
      )}
    </li>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 12l4-4 3 3 4-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
