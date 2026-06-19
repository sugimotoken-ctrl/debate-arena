import { NextResponse } from "next/server";
import { runRound } from "@/lib/orchestrator";
import { hasClaude, hasGpt } from "@/lib/debaters";
import { hasGemini } from "@/lib/moderator";
import type { DebateConfig, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { config, priorTurns, round } = (await req.json()) as {
      config: DebateConfig;
      priorTurns: Turn[];
      round: number;
    };

    if (!config?.topic || !config?.stanceA || !config?.stanceB) {
      return NextResponse.json(
        { error: "Missing topic or stances." },
        { status: 400 },
      );
    }

    const { turns, moderation } = await runRound(config, priorTurns ?? [], round ?? 0);
    const mock = !hasClaude() || !hasGpt() || !hasGemini();

    return NextResponse.json({ turns, moderation, mock });
  } catch (err: any) {
    console.error("[round] error", err);
    return NextResponse.json(
      { error: err?.message || "Debate round failed." },
      { status: 500 },
    );
  }
}
