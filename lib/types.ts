export type Side = "A" | "B";

export type Phase = "opening" | "rebuttal" | "closing";

export type Verdict = "ongoing" | "converged" | "impasse" | "timeout";

export interface DebateConfig {
  topic: string;
  stanceA: string;
  stanceB: string;
  personaA?: string;
  personaB?: string;
  maxRounds: number;
  agreementThreshold: number; // 0-100
}

export interface Turn {
  side: Side;
  phase: Phase;
  round: number;
  text: string;
  model: string;
}

export interface Moderation {
  round: number;
  agreements: string[];
  contested: string[];
  agreementScore: number; // 0-100
  verdict: Verdict;
  note: string;
}

export interface FinalSummary {
  sideAReasoning: string;
  sideBCounter: string;
  agreements: string[];
  disagreements: string[];
  verdict: Verdict;
  takeaway: string;
}

export interface Debate {
  id: string;
  config: DebateConfig;
  turns: Turn[];
  moderations: Moderation[];
  summary: FinalSummary | null;
  verdict: Verdict;
  createdAt: number;
  mock: boolean;
}

export const DEFAULT_CONFIG: Omit<DebateConfig, "topic" | "stanceA" | "stanceB"> =
  {
    maxRounds: 4,
    agreementThreshold: 80,
  };
