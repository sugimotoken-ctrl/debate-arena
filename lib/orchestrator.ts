import { claudeTurn, gptTurn } from "./debaters";
import { moderateRound } from "./moderator";
import type { DebateConfig, Moderation, Phase, Turn } from "./types";

// Side A = Claude (Opus 4.8), Side B = GPT (5.5 Thinking).

export function phaseFor(round: number, maxRounds: number): Phase {
  if (round === 0) return "opening";
  if (round >= maxRounds - 1) return "closing";
  return "rebuttal";
}

export function renderTranscript(turns: Turn[]): string {
  return turns
    .map(
      (t) =>
        `[${t.side === "A" ? "Side A" : "Side B"} · ${t.phase}] ${t.text}`,
    )
    .join("\n\n");
}

export async function runRound(
  cfg: DebateConfig,
  priorTurns: Turn[],
  round: number,
): Promise<{ turns: Turn[]; moderation: Moderation }> {
  const phase = phaseFor(round, cfg.maxRounds);
  const transcript = renderTranscript(priorTurns);

  // Both debaters respond to the same prior transcript, in parallel.
  const [a, b] = await Promise.all([
    claudeTurn(cfg, "A", phase, round, transcript),
    gptTurn(cfg, "B", phase, round, transcript),
  ]);

  const allTurns = [...priorTurns, a, b];
  const moderation = await moderateRound(cfg, allTurns, round);

  return { turns: [a, b], moderation };
}
