import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveDebate } from "@/lib/store";
import type { Debate } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { debate } = (await req.json()) as { debate: Omit<Debate, "id"> };
    const id = nanoid(10);
    const full: Debate = { ...debate, id };
    await saveDebate(full);
    return NextResponse.json({ id });
  } catch (err: any) {
    console.error("[save] error", err);
    return NextResponse.json(
      { error: err?.message || "Save failed." },
      { status: 500 },
    );
  }
}
