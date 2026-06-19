import { NextResponse } from "next/server";
import { finalSummary } from "@/lib/moderator";
import type { DebateConfig, Turn, Verdict } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { config, turns, verdict } = (await req.json()) as {
      config: DebateConfig;
      turns: Turn[];
      verdict: Verdict;
    };

    const summary = await finalSummary(config, turns ?? [], verdict ?? "timeout");
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[summary] error", err);
    return NextResponse.json(
      { error: err?.message || "Summary failed." },
      { status: 500 },
    );
  }
}
