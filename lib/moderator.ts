import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  DebateConfig,
  FinalSummary,
  Moderation,
  Turn,
  Verdict,
} from "./types";

export const GEMINI_MODEL = process.env.GOOGLE_MODEL || "gemini-2.5-flash";
export const hasGemini = () => !!process.env.GOOGLE_API_KEY;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function transcriptText(turns: Turn[]): string {
  return turns
    .map(
      (t) =>
        `[${t.side === "A" ? "Side A" : "Side B"} · ${t.phase}] ${t.text}`,
    )
    .join("\n\n");
}

function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json object found");
  return JSON.parse(body.slice(start, end + 1));
}

async function geminiJson(prompt: string): Promise<any> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  // Retry transient overload / rate-limit errors before giving up.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await model.generateContent(prompt);
      return extractJson(res.response.text());
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || "");
      const transient = /503|429|overload|high demand|unavailable/i.test(msg);
      if (!transient || attempt === 2) break;
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function moderateRound(
  cfg: DebateConfig,
  turns: Turn[],
  round: number,
): Promise<Moderation> {
  if (!hasGemini()) return mockModeration(turns, round, cfg);

  const prompt = [
    `You are a strictly neutral debate moderator. You do NOT take a side.`,
    `TOPIC: ${cfg.topic}`,
    `Side A argues: ${cfg.stanceA}`,
    `Side B argues: ${cfg.stanceB}`,
    ``,
    `Here is the debate so far:`,
    transcriptText(turns),
    ``,
    `Assess the CURRENT state. Respond ONLY with JSON matching this shape:`,
    `{`,
    `  "agreements": string[],   // points BOTH sides now explicitly accept`,
    `  "contested": string[],    // points still genuinely in dispute`,
    `  "agreementScore": number, // 0-100, how much common ground exists`,
    `  "verdict": "ongoing" | "converged" | "impasse",`,
    `  "note": string            // one neutral sentence on where things stand`,
    `}`,
    `Use "converged" only if agreementScore >= ${cfg.agreementThreshold}.`,
    `Use "impasse" only if the remaining disagreement looks irreducible (stable, value-based).`,
    `Otherwise "ongoing".`,
  ].join("\n");

  try {
    const j = await geminiJson(prompt);
    return {
      round,
      agreements: arr(j.agreements),
      contested: arr(j.contested),
      agreementScore: clampScore(j.agreementScore),
      verdict: normalizeVerdict(j.verdict),
      note: String(j.note ?? "").slice(0, 400),
    };
  } catch {
    return mockModeration(turns, round, cfg);
  }
}

export async function finalSummary(
  cfg: DebateConfig,
  turns: Turn[],
  verdict: Verdict,
): Promise<FinalSummary> {
  if (!hasGemini()) return mockSummary(cfg, verdict);

  const prompt = [
    `You are a strictly neutral debate moderator writing the closing summary.`,
    `TOPIC: ${cfg.topic}`,
    `Side A argued: ${cfg.stanceA}`,
    `Side B argued: ${cfg.stanceB}`,
    `Final verdict: ${verdict}`,
    ``,
    `Full debate:`,
    transcriptText(turns),
    ``,
    `Write a SHORT, neutral summary. Respond ONLY with JSON:`,
    `{`,
    `  "sideAReasoning": string, // 1-2 sentences: Side A's core reasoning`,
    `  "sideBCounter": string,   // 1-2 sentences: how Side B countered it`,
    `  "agreements": string[],   // what they ended up agreeing on`,
    `  "disagreements": string[],// what remained unresolved`,
    `  "takeaway": string        // one neutral closing sentence`,
    `}`,
  ].join("\n");

  try {
    const j = await geminiJson(prompt);
    return {
      sideAReasoning: String(j.sideAReasoning ?? ""),
      sideBCounter: String(j.sideBCounter ?? ""),
      agreements: arr(j.agreements),
      disagreements: arr(j.disagreements),
      verdict,
      takeaway: String(j.takeaway ?? ""),
    };
  } catch {
    return mockSummary(cfg, verdict);
  }
}

// ----- helpers -----

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean).slice(0, 8);
}
function clampScore(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function normalizeVerdict(v: any): Verdict {
  return v === "converged" || v === "impasse" ? v : "ongoing";
}

// ----- mock moderator (heuristic, deterministic-ish) -----

export function mockModeration(
  turns: Turn[],
  round: number,
  cfg: DebateConfig,
): Moderation {
  // Agreement creeps up each round so the meter visibly moves in mock mode.
  const score = Math.min(95, 25 + round * 22);
  const converged = score >= cfg.agreementThreshold;
  return {
    round,
    agreements:
      round === 0
        ? ["Both sides agree the question matters and is worth resolving."]
        : [
            "Both sides agree on the underlying goal.",
            "Both accept the main constraints in play.",
          ],
    contested: [
      "The size of the trade-off involved.",
      "Whether the proposed mechanism holds at scale.",
    ],
    agreementScore: score,
    verdict: converged ? "converged" : "ongoing",
    note: `(mock moderator) After round ${round + 1}, common ground is around ${score}%.`,
  };
}

export function mockSummary(cfg: DebateConfig, verdict: Verdict): FinalSummary {
  return {
    sideAReasoning: `Side A argued that ${cfg.stanceA}, leaning on evidence and long-run consequences.`,
    sideBCounter: `Side B countered that ${cfg.stanceB}, challenging whether the mechanism holds at scale.`,
    agreements: [
      "The goal both sides want is the same.",
      "Several constraints are shared.",
    ],
    disagreements: ["The core trade-off remains unresolved."],
    verdict,
    takeaway:
      verdict === "converged"
        ? "(mock) The sides found substantial common ground."
        : "(mock) The sides clarified the disagreement without fully resolving it.",
  };
}
