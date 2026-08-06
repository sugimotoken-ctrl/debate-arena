"use client";

import type { SourceModule, OpportunityStatus } from "@/lib/radar/types";
import { MODULE_META } from "./moduleMeta";

export interface Filters {
  module: SourceModule | "all";
  minScore: number;
  status: OpportunityStatus | "all";
}

const MODULES: (SourceModule | "all")[] = ["all", "guided"];
const STATUSES: (OpportunityStatus | "all")[] = ["all", "new", "interesting", "researching", "rejected"];

export function FilterBar({ filters, onChange, count }: { filters: Filters; onChange: (n: Filters) => void; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-4 py-3 ring-1 ring-black/5">
      <span className="text-xs text-neutral-400">View</span>
      {MODULES.map((m) => {
        const active = filters.module === m;
        const label = m === "all" ? "All" : MODULE_META[m].label;
        return (
          <button
            key={m}
            onClick={() => onChange({ ...filters, module: m })}
            className={`rounded-md px-2.5 py-1 text-xs ring-1 transition ${active ? "ring-transparent" : "text-neutral-600 ring-black/10 hover:bg-neutral-50"}`}
            style={active ? { background: "#EEEDFE", color: "#3C3489" } : undefined}
          >
            {label}
          </button>
        );
      })}
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <label className="flex items-center gap-2 text-xs text-neutral-500">
        Min score
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minScore}
          onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
        />
        <span className="w-6 font-medium text-neutral-700">{filters.minScore}</span>
      </label>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <label className="flex items-center gap-2 text-xs text-neutral-500">
        Status
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as Filters["status"] })}
          className="rounded-md bg-white px-2 py-1 text-xs text-neutral-700 ring-1 ring-black/10"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <span className="ml-auto text-xs text-neutral-400">{count} shown · sorted by score</span>
    </div>
  );
}
