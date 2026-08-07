"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Opportunity, OpportunityStatus, SearchMeta } from "@/lib/radar/types";
import { GuidedSearch } from "./GuidedSearch";
import { MarketSnapshot } from "./MarketSnapshot";
import { StatsBar } from "./StatsBar";
import { FilterBar, type Filters } from "./FilterBar";
import { OpportunityCard } from "./OpportunityCard";

// A search runs on the server and saves to the database even if you leave the
// tab. This marker lets Radar re-attach to an in-flight search when you return.
const SEARCH_KEY = "radar_search_inflight";
const MAX_SEARCH_MS = 5 * 60 * 1000;

type Marker = { topic: string; region: string; baseline: number; startedAt: number };
const queryOf = (m: { topic: string; region: string }) => (m.region ? `${m.topic} · ${m.region}` : m.topic);

export default function RadarApp() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filters, setFilters] = useState<Filters>({ module: "all", minScore: 0, status: "all" });
  const [searching, setSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const [lastMeta, setLastMeta] = useState<SearchMeta | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false); // re-attached to a background search
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function readMarker(): Marker | null {
    try {
      const raw = localStorage.getItem(SEARCH_KEY);
      return raw ? (JSON.parse(raw) as Marker) : null;
    } catch {
      return null;
    }
  }
  const setMarker = (m: Marker) => localStorage.setItem(SEARCH_KEY, JSON.stringify(m));
  const clearMarker = () => localStorage.removeItem(SEARCH_KEY);

  const loadOpportunities = () =>
    fetch("/api/radar/opportunities")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d.opportunities) ? (d.opportunities as Opportunity[]) : []));

  // Poll the database until the in-flight search's results have been saved.
  function pollForResults(m: Marker) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (Date.now() - m.startedAt > MAX_SEARCH_MS) {
        stopPolling();
        setSearching(false);
        setResumed(false);
        clearMarker();
        return;
      }
      try {
        const list = await loadOpportunities();
        if (list.length > m.baseline) {
          setOpportunities(list);
          setLastSearch(queryOf(m));
          setFilters((f) => ({ ...f, module: "guided", minScore: 0, status: "all" }));
          setSearching(false);
          setResumed(false);
          clearMarker();
          stopPolling();
        }
      } catch {}
    }, 6000);
  }
  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  // On mount: load saved ideas, and re-attach to any background search.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadOpportunities().catch(() => [] as Opportunity[]);
      if (cancelled) return;
      setOpportunities(list);
      const m = readMarker();
      if (m && Date.now() - m.startedAt < MAX_SEARCH_MS) {
        if (list.length > m.baseline) {
          // Results already landed while we were away.
          setLastSearch(queryOf(m));
          setFilters((f) => ({ ...f, module: "guided" }));
          clearMarker();
        } else {
          // Still running — show it and wait for the results.
          setSearching(true);
          setResumed(true);
          setLastSearch(queryOf(m));
          pollForResults(m);
        }
      } else if (m) {
        clearMarker();
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
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
    setResumed(false);
    setMarker({ topic, region, baseline: opportunities.length, startedAt: Date.now() });
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
      clearMarker();
      setSearching(false);
    } catch (e) {
      // If we navigated away, the server still finishes + saves; the resume
      // logic will pick it up. Only surface an error if we're still mounted here.
      setSearchError(e instanceof Error ? e.message : "Search failed.");
      clearMarker();
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-4">
        <GuidedSearch onSearch={runGuidedSearch} searching={searching} />
        {resumed && searching && (
          <div className="rounded-lg bg-violet-50 px-4 py-2.5 text-[13px] text-violet-800 ring-1 ring-violet-200">
            Still searching{lastSearch ? ` for “${lastSearch}”` : ""} in the background — results will appear here automatically. You can switch tabs; it won’t stop.
          </div>
        )}
        {searchError && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-800 ring-1 ring-red-200">{searchError}</div>}
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
              {searching
                ? "Searching…"
                : opportunities.length === 0
                  ? "No ideas yet — point the radar at a topic above to get started."
                  : "No ideas match these filters."}
            </div>
          ) : (
            visible.map((opp) => <OpportunityCard key={opp.id} opp={opp} onStatusChange={setStatus} onNotesChange={setNotes} />)
          )}
        </div>
      </div>
    </div>
  );
}
