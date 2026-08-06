"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Opportunity, OpportunityStatus, SearchMeta } from "@/lib/radar/types";
import { GuidedSearch } from "./GuidedSearch";
import { MarketSnapshot } from "./MarketSnapshot";
import { StatsBar } from "./StatsBar";
import { FilterBar, type Filters } from "./FilterBar";
import { OpportunityCard } from "./OpportunityCard";

export default function RadarApp() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filters, setFilters] = useState<Filters>({ module: "all", minScore: 0, status: "all" });
  const [searching, setSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const [lastMeta, setLastMeta] = useState<SearchMeta | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch("/api/radar/opportunities")
      .then((r) => r.json())
      .then((d) => Array.isArray(d.opportunities) && setOpportunities(d.opportunities))
      .catch(() => {});
  }, []);

  const visible = useMemo(
    () =>
      opportunities
        .filter((o) => filters.module === "all" || o.sourceModule === filters.module)
        .filter((o) => o.scoreTotal >= filters.minScore)
        .filter((o) => filters.status === "all" || o.status === filters.status)
        .sort((a, b) => b.scoreTotal - a.scoreTotal),
    [opportunities, filters],
  );

  function persist(id: string, patch: { status?: OpportunityStatus; notes?: string }) {
    fetch(`/api/radar/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  function setStatus(id: string, status: OpportunityStatus) {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    persist(id, { status });
  }
  function setNotes(id: string, notes: string) {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, notes } : o)));
    clearTimeout(notesTimers.current[id]);
    notesTimers.current[id] = setTimeout(() => persist(id, { notes }), 700);
  }

  async function runGuidedSearch(topic: string, region: string) {
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/radar/guided-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      const results: Opportunity[] = data.opportunities || [];
      if (results.length === 0) throw new Error("No opportunities found for that topic. Try rephrasing.");
      setOpportunities((prev) => [...results, ...prev]);
      setLastSearch(results[0]?.searchQuery ?? topic);
      setLastCost(data.meta?.estCostUsd ?? null);
      setLastMeta(data.meta ?? null);
      setFilters((f) => ({ ...f, module: "guided", minScore: 0, status: "all" }));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-4">
        <GuidedSearch onSearch={runGuidedSearch} searching={searching} />
        {searchError && (
          <div className="rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-800 ring-1 ring-red-200">{searchError}</div>
        )}
        <StatsBar opportunities={opportunities} />
        <FilterBar filters={filters} onChange={setFilters} count={visible.length} />

        {filters.module === "guided" && lastSearch && (
          <div className="flex items-center justify-between rounded-lg px-4 py-2.5 text-[13px]" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <span>
              Showing results for your search: <strong>{lastSearch}</strong>
              {lastCost != null && <span className="ml-1 text-violet-700">· this search cost ~${lastCost.toFixed(2)}</span>}
            </span>
            <button onClick={() => setFilters((f) => ({ ...f, module: "all" }))} className="rounded-md px-2 py-1 text-[12px] underline">
              Back to all ideas
            </button>
          </div>
        )}

        {filters.module === "guided" && lastMeta && <MarketSnapshot meta={lastMeta} />}

        <div className="space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-neutral-400 ring-1 ring-black/5">
              {opportunities.length === 0 ? "No ideas yet — point the radar at a topic above to get started." : "No ideas match these filters."}
            </div>
          ) : (
            visible.map((opp) => <OpportunityCard key={opp.id} opp={opp} onStatusChange={setStatus} onNotesChange={setNotes} />)
          )}
        </div>
      </div>
    </div>
  );
}
