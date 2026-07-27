import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runAdvisers, runSynthesis } from "@/lib/rooms";
import type { Lang } from "@/lib/advisers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { id } = await params;
  const { topic, context, adviserIds, language } = (await req.json()) as {
    topic: string;
    context?: string;
    adviserIds: string[];
    language?: Lang;
  };

  if (!topic?.trim() || !adviserIds?.length) {
    return NextResponse.json(
      { error: "Need a topic and at least one adviser." },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  await admin
    .from("rooms")
    .update({
      topic: topic.trim(),
      context: (context || "").trim(),
      adviser_ids: adviserIds,
      language: language || "auto",
      convened: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  const advices = await runAdvisers(admin, id, {
    topic: topic.trim(),
    context: (context || "").trim(),
    adviserIds,
    language: language || "auto",
    history: "",
  });

  if (advices.length) {
    await runSynthesis(admin, id, {
      topic: topic.trim(),
      context: (context || "").trim(),
      advices,
      language: language || "auto",
      history: "",
    });
  }

  return NextResponse.json({ ok: true });
}
