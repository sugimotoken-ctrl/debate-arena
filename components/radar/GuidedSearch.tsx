"use client";

import { useState } from "react";

export function GuidedSearch({ onSearch, searching }: { onSearch: (topic: string, region: string) => void; searching: boolean }) {
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("");

  function submit() {
    if (!topic.trim() || searching) return;
    onSearch(topic, region);
  }

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-black/5 sm:px-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "#EEEDFE", color: "#3C3489" }}>
          <SearchIcon />
        </span>
        <h2 className="text-[15px] font-medium text-neutral-900">Point the radar at a topic</h2>
      </div>
      <p className="mb-3 text-[13px] text-neutral-500">
        Name an industry, area, or idea — e.g. “protein bars” — and Radar analyses real customer reviews (Amazon, Trustpilot, Google) plus Google Trends and keyword demand, then reports opportunities with the numbers behind them.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Topic, industry or area (e.g. protein bars)"
          className="flex-1 rounded-lg bg-white px-3 py-2 text-[14px] text-neutral-800 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Region (optional, e.g. US)"
          className="rounded-lg bg-white px-3 py-2 text-[14px] text-neutral-800 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-violet-300 sm:w-48"
        />
        <button
          onClick={submit}
          disabled={!topic.trim() || searching}
          className="rounded-lg px-4 py-2 text-[14px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "#534AB7" }}
        >
          {searching ? "Searching…" : "Find opportunities"}
        </button>
      </div>

      <p className="mt-2 text-[12px] text-neutral-400">
        Live research across the dominant brands in the space: hundreds of real reviews + market data, analysed by Claude. Each search shows its cost and takes ~1–2 minutes.
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
