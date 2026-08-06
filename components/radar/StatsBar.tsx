"use client";

import type { Opportunity } from "@/lib/radar/types";

export function StatsBar({ opportunities }: { opportunities: Opportunity[] }) {
  const total = opportunities.length;
  const avg = total === 0 ? 0 : Math.round(opportunities.reduce((s, o) => s + o.scoreTotal, 0) / total);
  const researching = opportunities.filter((o) => o.status === "researching").length;
  const high = opportunities.filter((o) => o.scoreTotal >= 80).length;

  const stats = [
    { label: "Total ideas", value: total },
    { label: "Avg score", value: avg },
    { label: "Researching", value: researching },
    { label: "High (80+)", value: high },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg bg-white/70 px-4 py-3 ring-1 ring-black/5">
          <div className="text-[13px] text-neutral-500">{s.label}</div>
          <div className="text-2xl font-medium text-neutral-900">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
