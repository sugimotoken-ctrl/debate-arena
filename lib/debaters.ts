import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { DebateConfig, Phase, Side, Turn } from "./types";

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
// NOTE: confirm the exact GPT-5.5 Thinking model id for your account and set
// OPENAI_MODEL in .env.local. This default is a best guess.
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5-thinking";

export const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;
export const hasGpt = () => !!process.env.OPENAI_API_KEY;

const PHASE_GUIDANCE: Record<Phase, string> = {
  opening:
    "Give your OPENING statement. State your strongest 2-3 reasons for your position. Be specific.",
  rebuttal:
    "REBUT your opponent's most recent argument directly, then advance your own case. Concede any point that is genuinely correct — intellectual honesty is rewarded.",
  closing:
    "Give your CLOSING statement. Summarize where you and your opponent now agree, and the core of what still divides you.",
};

function buildPrompt(
  cfg: DebateConfig,
  side: Side,
  phase: Phase,
  transcript: string,
): { system: string; user: string } {
  const myStance = side === "A" ? cfg.stanceA : cfg.stanceB;
  const theirStance = side === "A" ? cfg.stanceB : cfg.stanceA;
  const persona = side === "A" ? cfg.personaA : cfg.personaB;

  const system = [
    `You are a sharp, fair-minded debater in a structured debate.`,
    `TOPIC: ${cfg.topic}`,
    `YOUR POSITION: ${myStance}`,
    `OPPONENT'S POSITION: ${theirStance}`,
    persona ? `YOUR PERSONA / STYLE: ${persona}` : "",
    `Rules: argue ONLY for your position. Be concise — at most ~150 words.`,
    `Do not be sycophantic or repeat yourself. No preamble, no "As an AI". Write the argument directly.`,
    `Where your opponent is genuinely right, say so explicitly — partial agreement is a valid and valuable outcome.`,
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    transcript ? `DEBATE SO FAR:\n${transcript}` : `The debate is just beginning.`,
    "",
    PHASE_GUIDANCE[phase],
  ].join("\n");

  return { system, user };
}

export async function claudeTurn(
  cfg: DebateConfig,
  side: Side,
  phase: Phase,
  round: number,
  transcript: string,
): Promise<Turn> {
  const { system, user } = buildPrompt(cfg, side, phase, transcript);

  if (!hasClaude()) {
    return mockTurn(cfg, side, phase, round, `${ANTHROPIC_MODEL} (mock)`);
  }

  const client = new Anthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { side, phase, round, text, model: ANTHROPIC_MODEL };
}

export async function gptTurn(
  cfg: DebateConfig,
  side: Side,
  phase: Phase,
  round: number,
  transcript: string,
): Promise<Turn> {
  const { system, user } = buildPrompt(cfg, side, phase, transcript);

  if (!hasGpt()) {
    return mockTurn(cfg, side, phase, round, `${OPENAI_MODEL} (mock)`);
  }

  const client = new OpenAI();
  const res = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: system,
    input: user,
    max_output_tokens: 2000,
  });

  const text = (res.output_text || "").trim();
  return { side, phase, round, text, model: OPENAI_MODEL };
}

// ----- Mock generation (so the app runs before keys are added) -----

const strip = (s: string) => s.replace(/[.\s]+$/, "");

const MOCK_LINES: Record<Phase, (stance: string, r: number) => string> = {
  opening: (s) =>
    `My position is clear: ${strip(s)}. The strongest case rests on three points — the evidence we have, the incentives at play, and the long-run consequences of the alternative. I'll defend each as we go.`,
  rebuttal: (s, r) =>
    `My opponent makes a fair point, and I'll grant the narrow version of it. But it doesn't reach the core claim. Reasserting that ${strip(s)}, the burden is on the other side to show their mechanism actually holds at scale (round ${r}).`,
  closing: (s) =>
    `Closing: we've converged on more than it first seemed — we agree on the goal and several constraints. Where we still differ is the trade-off, and I maintain that ${strip(s)}.`,
};

export function mockTurn(
  cfg: DebateConfig,
  side: Side,
  phase: Phase,
  round: number,
  model: string,
): Turn {
  const stance = side === "A" ? cfg.stanceA : cfg.stanceB;
  return {
    side,
    phase,
    round,
    text: MOCK_LINES[phase](stance, round),
    model,
  };
}
