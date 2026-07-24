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
  ongoing: "#8A8A9A",
  converged: "#0E9E6E",
  impasse: "#FF4D9D",
  timeout: "#FF9F1C",
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
    <section className="space-y-3" style={{ borderTop: "1px solid rgba(20,20,28,.1)", paddingTop: 24 }}>
      <div className="flex items-center justify-between">
        <h2 className="font-display" style={{ fontSize: 22 }}>
          HISTORY{" "}
          <span style={{ color: "#9A9AAC", fontSize: 14 }}>({items.length})</span>
        </h2>
        <button
          onClick={onClear}
          style={{ fontSize: 12, color: "#9A9AAC" }}
          className="hover:underline"
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
              className="bg-white"
              style={{ border: "1px solid rgba(20,20,28,.08)", borderRadius: 14 }}
            >
              <button
                onClick={() => setOpenId(open ? null : d.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span style={{ color: "#9A9AAC", fontSize: 12, width: 12 }}>
                  {open ? "▾" : "▸"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 14, color: "#14141C" }}>
                    {d.config.topic}
                  </div>
                  <div style={{ fontSize: 12, color: "#9A9AAC" }}>
                    {new Date(d.createdAt).toLocaleString()} · {d.turns.length}{" "}
                    turns · {score}% agreement
                    {d.mock ? " · mock" : ""}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: VERDICT_COLOR[d.verdict] }}>
                  {VERDICT_TEXT[d.verdict]}
                </span>
              </button>

              {open && (
                <div className="p-3 space-y-3" style={{ borderTop: "1px solid rgba(20,20,28,.08)" }}>
                  <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
                    {d.shared && (
                      <a href={`/debate/${d.id}`} className="underline" style={{ color: "#0E9E6E" }}>
                        Open shareable link →
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (openId === d.id) setOpenId(null);
                        onDelete(d.id);
                      }}
                      className="ml-auto hover:underline"
                      style={{ color: "#9A9AAC" }}
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
