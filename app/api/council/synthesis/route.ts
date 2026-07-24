import { NextResponse } from "next/server";
import { synthesize, type Advice, type Lang } from "@/lib/advisers";
import { hasGpt } from "@/lib/debaters";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { topic, context, advices, language } = (await req.json()) as {
      topic: string;
      context?: string;
      advices: Advice[];
      language?: Lang;
    };

    const synthesis = await synthesize(
      topic || "",
      (context || "").trim(),
      advices || [],
      language || "auto",
    );
    return NextResponse.json({ synthesis, mock: !hasGpt() });
  } catch (err: any) {
    console.error("[council/synthesis] error", err);
    return NextResponse.json(
      { error: err?.message || "Synthesis failed." },
      { status: 500 },
    );
  }
}
