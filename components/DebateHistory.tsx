"use client";

import { useState } from "react";
import DebateBoard from "./DebateBoard";
import type { Debate, Verdict } from "@/lib/types";

const VERDICT_TEXT: Record<Verdict, string> = {
  ongoing: "In progress",
  converged: "Converged",
  impasse: "Impasse",
  timeout: "Partial",
};
const VERDICT_COLOR: Record<Verdict, string> = {
  ongoing: "text-slate-400",
  converged: "text-emerald-400",
  impasse: "text-rose-400",
  timeout: "text-amber-400",
};

export default function DebateHistory({
  items,
  onDelete,
  onClear,
}: {
  items: Debate[];
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 pb-16 space-y-3">
      <div className="flex items-center justify-between border-t border-slate-800 pt-6">
        <h2 className="text-lg font-semibold text-white">
          History{" "}
          <span className="text-slate-500 text-sm font-normal">
            ({items.length})
          </span>
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-rose-400"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {items.map((d) => {
          const open = openId === d.id;
          const score = d.moderations.length
            ? d.moderations[d.moderations.length - 1].agreementScore
            : 0;
          return (
            <div
              key={d.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40"
            >
              <button
                onClick={() => setOpenId(open ? null : d.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-900/60"
              >
                <span className="text-slate-500 text-xs w-3">
                  {open ? "▾" : "▸"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {d.config.topic}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(d.createdAt).toLocaleString()} · {d.turns.length}{" "}
                    turns · {score}% agreement
                    {d.mock ? " · mock" : ""}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${VERDICT_COLOR[d.verdict]}`}
                >
                  {VERDICT_TEXT[d.verdict]}
                </span>
              </button>

              {open && (
                <div className="p-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center gap-4 text-xs">
                    {d.shared && (
                      <a
                        href={`/debate/${d.id}`}
                        className="underline text-emerald-400"
                      >
                        Open shareable link →
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (openId === d.id) setOpenId(null);
                        onDelete(d.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                  <DebateBoard
                    config={d.config}
                    turns={d.turns}
                    moderations={d.moderations}
                    summary={d.summary}
                    verdict={d.verdict}
                    running={false}
                    mock={d.mock}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
