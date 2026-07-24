import { NextResponse } from "next/server";
import { synthesize, type Advice } from "@/lib/advisers";
import { hasClaude } from "@/lib/debaters";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic, context, advices } = (await req.json()) as {
      topic: string;
      context?: string;
      advices: Advice[];
    };

    const synthesis = await synthesize(
      topic || "",
      (context || "").trim(),
      advices || [],
    );
    return NextResponse.json({ synthesis, mock: !hasClaude() });
  } catch (err: any) {
    console.error("[council/synthesis] error", err);
    return NextResponse.json(
      { error: err?.message || "Synthesis failed." },
      { status: 500 },
    );
  }
}
