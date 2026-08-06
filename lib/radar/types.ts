// Shared types for the Opportunity Radar tab.

export type SourceModule = "pain_point" | "trend" | "regulation" | "guided";
export type Urgency = "time_limited" | "durable";
export type OpportunityStatus = "new" | "interesting" | "researching" | "rejected";

export interface Evidence {
  kind: "link" | "quote" | "metric";
  label: string;
  value: string;
  url?: string;
}

export interface ReviewSignal {
  label: string;
  pct: number;
  source: string;
}

export interface ScoreBreakdown {
  demand: { score: number; max: 40; reason: string };
  competition: { score: number; max: 30; reason: string };
  feasibility: { score: number; max: 20; reason: string };
  timing: { score: number; max: 10; reason: string };
}

export interface Opportunity {
  id: string;
  sourceModule: SourceModule;
  title: string;
  problemStatement: string;
  targetCustomer: string;
  evidence: Evidence[];
  scores: ScoreBreakdown;
  scoreTotal: number;
  urgency: Urgency | null;
  nextValidationStep: string;
  status: OpportunityStatus;
  notes: string;
  matchCount: number;
  createdAt: string;
  searchQuery?: string;
  reviewsAnalyzed?: number;
  reviewSources?: string[];
  reviewSignals?: ReviewSignal[];
}

export interface SearchMeta {
  query: string;
  reviewCount: number;
  sourceBreakdown?: { amazon?: number; google: number; trustpilot: number; reddit: number };
  ratingDistribution?: Record<string, number>;
  trends?: "rising" | "flat" | "declining" | null;
  keyword?: { volume?: number | null; growthPct?: number | null } | null;
  businesses?: string[];
  companies?: string[];
  estCostUsd?: number;
}
