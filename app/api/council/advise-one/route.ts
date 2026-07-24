import { NextResponse } from "next/server";
import { adviserById, adviseOne, type Lang } from "@/lib/advisers";
import { hasGpt } from "@/lib/debaters";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { topic, context, adviserId, language } = (await req.json()) as {
      topic: string;
      context?: string;
      adviserId: string;
      language?: Lang;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Missing topic." }, { status: 400 });
    }
    const adviser = adviserById(adviserId);
    if (!adviser) {
      return NextResponse.json({ error: "Unknown adviser." }, { status: 400 });
    }

    const advice = await adviseOne(
      adviser,
      topic.trim(),
      (context || "").trim(),
      language || "auto",
    );
    return NextResponse.json({ advice, mock: !hasGpt() });
  } catch (err: any) {
    console.error("[council/advise-one] error", err);
    return NextResponse.json(
      { error: err?.message || "Adviser failed." },
      { status: 500 },
    );
  }
}
