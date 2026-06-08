"use client";

import { useEffect, useRef, useState } from "react";
import { useTeam } from "@/hooks/useBloomData";
import type { TeamMember } from "@/lib/bloom/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  return (
    <span
      className={`flex h-${size} w-${size} shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-300`}
    >
      {initials(name)}
    </span>
  );
}

export default function UserPicker({
  currentUserId,
  selectedIds,
  onChange,
}: {
  currentUserId: string;
  /** IDs of extra team members whose items are shown alongside yours. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: members, isLoading } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(memberId: string) {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  }

  // Team members excluding the current user (you're always shown)
  const teammates = members?.filter((m) => m.id !== currentUserId) ?? [];
  const selectedMembers = teammates.filter((m) => selectedIds.includes(m.id));
  const hasExtra = selectedMembers.length > 0;

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      {/* Selected teammate avatars */}
      {selectedMembers.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {selectedMembers.slice(0, 4).map((m) => (
            <span
              key={m.id}
              title={m.name}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#111113] bg-zinc-700 text-[9px] font-semibold text-zinc-300"
            >
              {initials(m.name)}
            </span>
          ))}
          {selectedMembers.length > 4 && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#111113] bg-zinc-600 text-[9px] font-semibold text-zinc-300">
              +{selectedMembers.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={hasExtra ? "Edit team view" : "Add team members"}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition ${
          hasExtra
            ? "border-bloom/40 bg-bloom/10 text-bloom hover:bg-bloom/20"
            : "border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1 13c0-2.8 2.2-4 5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 9v4M10 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span>{hasExtra ? `+${selectedMembers.length} teammate${selectedMembers.length > 1 ? "s" : ""}` : "Team"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1d] shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Add team members
            </p>
            {hasExtra && (
              <button
                onClick={() => onChange([])}
                className="text-[10px] text-zinc-600 transition hover:text-zinc-400"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {isLoading && (
              <p className="px-3 py-2 text-xs text-zinc-600">Loading team…</p>
            )}

            {!isLoading && teammates.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-600">
                No teammates found. Set <code className="text-zinc-500">BLOOM_MEETING_ID</code> to load your team.
              </p>
            )}

            {teammates.map((member) => {
              const checked = selectedIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => toggle(member.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-white/[0.05]"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                      checked
                        ? "border-bloom bg-bloom text-white"
                        : "border-white/[0.15] bg-white/[0.03] text-transparent"
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-300">
                    {initials(member.name)}
                  </span>
                  <span className={`flex-1 truncate ${checked ? "text-zinc-100" : "text-zinc-400"}`}>
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>

          {hasExtra && (
            <div className="border-t border-white/[0.06] px-3 py-2">
              <p className="text-[10px] text-zinc-600">
                Showing your items + {selectedMembers.length} teammate{selectedMembers.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
