import { NextResponse } from "next/server";
import { ADVISERS, adviseOne } from "@/lib/advisers";
import { hasClaude } from "@/lib/debaters";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic, context, adviserIds } = (await req.json()) as {
      topic: string;
      context?: string;
      adviserIds: string[];
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Missing topic." }, { status: 400 });
    }
    const chosen = ADVISERS.filter((a) => adviserIds?.includes(a.id));
    if (chosen.length === 0) {
      return NextResponse.json(
        { error: "Select at least one adviser." },
        { status: 400 },
      );
    }

    const advices = await Promise.all(
      chosen.map((a) => adviseOne(a, topic.trim(), (context || "").trim())),
    );

    return NextResponse.json({ advices, mock: !hasClaude() });
  } catch (err: any) {
    console.error("[council/advise] error", err);
    return NextResponse.json(
      { error: err?.message || "Council failed." },
      { status: 500 },
    );
  }
}
