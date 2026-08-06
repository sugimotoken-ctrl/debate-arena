"use client";

import { useState } from "react";
import type { Opportunity, OpportunityStatus } from "@/lib/radar/types";
import { MODULE_META, STATUS_META } from "./moduleMeta";

const STATUS_ACTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "interesting", label: "Interesting" },
  { value: "researching", label: "Researching" },
  { value: "rejected", label: "Reject" },
];

export function OpportunityCard({
  opp,
  onStatusChange,
  onNotesChange,
}: {
  opp: Opportunity;
  onStatusChange: (id: string, status: OpportunityStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = MODULE_META[opp.sourceModule];

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-black/5 sm:px-5">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: meta.scoreBg, width: 52, height: 52 }}>
          <div className="text-[22px] font-medium leading-none" style={{ color: meta.scoreText }}>{opp.scoreTotal}</div>
          <div className="text-[9px]" style={{ color: meta.scoreText }}>score</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2 py-0.5 text-[11px]" style={{ background: meta.badgeBg, color: meta.badgeText }}>{meta.label}</span>
            {opp.urgency === "time_limited" && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Time-limited</span>}
            {opp.urgency === "durable" && <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">Durable</span>}
            <span className="rounded-md px-2 py-0.5 text-[11px]" style={{ background: STATUS_META[opp.status].bg, color: STATUS_META[opp.status].text }}>
              {STATUS_META[opp.status].label}
            </span>
          </div>

          <h3 className="text-[16px] font-medium text-neutral-900">{opp.title}</h3>
          <p className="mt-0.5 text-[14px] leading-relaxed text-neutral-600">{opp.problemStatement}</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            {opp.targetCustomer} ·{" "}
            {opp.reviewsAnalyzed != null ? `${opp.reviewsAnalyzed} reviews analysed` : `${opp.matchCount} matching sources`}
          </p>

          {opp.reviewSignals && opp.reviewSignals.length > 0 && (
            <div className="mt-2.5 space-y-2 rounded-lg bg-violet-50 p-2.5">
              <div className="text-[12px] font-medium text-violet-900">
                What reviewers said{opp.reviewSources ? ` · ${opp.reviewSources.join(", ")}` : ""}
              </div>
              {opp.reviewSignals.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-neutral-700">{s.label}</span>
                    <span className="shrink-0 pl-2 tabular-nums text-violet-800">{s.pct}% · {s.source}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-violet-100">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "#7F77DD" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        {STATUS_ACTIONS.map((a) => {
          const active = opp.status === a.value;
          const sm = STATUS_META[a.value];
          return (
            <button
              key={a.value}
              onClick={() => onStatusChange(opp.id, active ? "new" : a.value)}
              className={`rounded-md px-2.5 py-1 text-xs ring-1 transition ${active ? "ring-transparent" : "text-neutral-600 ring-black/10 hover:bg-neutral-50"}`}
              style={active ? { background: sm.bg, color: sm.text } : undefined}
            >
              {a.label}
            </button>
          );
        })}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto rounded-md px-2.5 py-1 text-xs text-neutral-600 ring-1 ring-black/10 transition hover:bg-neutral-50"
        >
          {expanded ? "Hide evidence" : "Expand evidence"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-neutral-100 pt-4">
          <ScoreBreakdown opp={opp} />
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-neutral-700">Evidence</div>
            <ul className="space-y-1.5">
              {opp.evidence.map((e, i) => (
                <li key={i} className="text-[13px] text-neutral-600">
                  <span className="text-neutral-400">{e.label}: </span>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">{e.value}</a>
                  ) : (
                    <span>{e.kind === "quote" ? `“${e.value}”` : e.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <div className="mb-1 text-[13px] font-medium text-neutral-700">Next validation step</div>
            <p className="text-[13px] text-neutral-600">{opp.nextValidationStep}</p>
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-neutral-700">Your notes</div>
            <textarea
              value={opp.notes}
              onChange={(e) => onNotesChange(opp.id, e.target.value)}
              placeholder="Add a note — saved with the idea."
              rows={2}
              className="w-full rounded-lg bg-white p-2.5 text-[13px] text-neutral-700 ring-1 ring-black/10 focus:outline-none focus:ring-sky-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBreakdown({ opp }: { opp: Opportunity }) {
  const rows = [
    { label: "Demand signal", ...opp.scores.demand },
    { label: "Competition gap", ...opp.scores.competition },
    { label: "Feasibility", ...opp.scores.feasibility },
    { label: "Timing / urgency", ...opp.scores.timing },
  ];
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-neutral-700">Score breakdown</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-neutral-600">{r.label}</span>
              <span className="tabular-nums text-neutral-500">{r.score} / {r.max}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-sky-600" style={{ width: `${(r.score / r.max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[12px] text-neutral-400">{r.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
