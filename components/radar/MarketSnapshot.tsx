"use client";

import type { SearchMeta } from "@/lib/radar/types";

const TREND = {
  rising: { label: "Rising", color: "#0F6E56", icon: "M3 17l6-6 4 4 8-8" },
  flat: { label: "Flat", color: "#5F5E5A", icon: "M3 12h18" },
  declining: { label: "Declining", color: "#A32D2D", icon: "M3 7l6 6 4-4 8 8" },
};

const STAR_COLOR: Record<number, string> = { 5: "#1D9E75", 4: "#63991A", 3: "#BA7517", 2: "#D85A30", 1: "#A32D2D" };

export function MarketSnapshot({ meta }: { meta: SearchMeta }) {
  const dist = meta.ratingDistribution || {};
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const negative = (dist["1"] || 0) + (dist["2"] || 0);
  const negativePct = total ? Math.round((negative / total) * 100) : 0;
  const trend = meta.trends ? TREND[meta.trends] : TREND.flat;
  const vol = meta.keyword?.volume;
  const growth = meta.keyword?.growthPct;
  const src = meta.sourceBreakdown;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-black/5 sm:px-5">
      <div className="mb-3 text-[13px] font-medium text-neutral-700">Market snapshot — the real numbers behind these ideas</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Monthly searches" value={vol != null ? vol.toLocaleString() : "—"} />
        <Metric
          label="Search growth"
          value={growth != null ? `${growth > 0 ? "+" : ""}${growth}%` : "—"}
          color={growth == null ? undefined : growth >= 0 ? "#0F6E56" : "#A32D2D"}
        />
        <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
          <div className="text-[12px] text-neutral-500">Trend</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={trend.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={trend.icon} />
            </svg>
            <span className="text-[15px] font-medium" style={{ color: trend.color }}>{trend.label}</span>
          </div>
        </div>
        <Metric label="Reviews analysed" value={String(meta.reviewCount)} />
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-700">Review sentiment</span>
            <span className="text-[12px] text-neutral-400">
              {src
                ? [src.amazon && `${src.amazon} Amazon`, src.trustpilot && `${src.trustpilot} Trustpilot`, src.google && `${src.google} Google`]
                    .filter(Boolean)
                    .join(" · ")
                : `${total} reviews`}
            </span>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = dist[String(star)] || 0;
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-right text-[12px] tabular-nums text-neutral-500">{star}★</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-neutral-100">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: STAR_COLOR[star] }} />
                  </div>
                  <span className="w-12 shrink-0 text-[12px] tabular-nums text-neutral-400">{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-neutral-500">
            <strong style={{ color: negativePct >= 25 ? "#A32D2D" : "#5F5E5A" }}>{negativePct}%</strong> of reviews are 1–2★ — that dissatisfaction is where the openings are.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
      <div className="text-[12px] text-neutral-500">{label}</div>
      <div className="mt-0.5 text-[18px] font-medium" style={{ color: color || "#1f1f1d" }}>{value}</div>
    </div>
  );
}
