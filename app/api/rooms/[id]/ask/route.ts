import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildHistory, runAdvisers, runSynthesis } from "@/lib/rooms";
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
  const { body } = (await req.json()) as { body: string };
  if (!body?.trim()) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  // Record the human's question (under their own session, RLS-checked).
  const sb = await supabaseServer();
  await sb.from("messages").insert({
    room_id: id,
    author_type: "user",
    author_id: me.id,
    author_name: me.full_name || me.email,
    kind: "question",
    body: body.trim(),
  });

  // Re-summon the council with the full prior discussion as context.
  const admin = supabaseAdmin();
  const { data: room } = await admin
    .from("rooms")
    .select("topic,context,adviser_ids,language")
    .eq("id", id)
    .single();
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const { data: msgs } = await admin
    .from("messages")
    .select("author_type,author_name,kind,body,bottom_line,meta")
    .eq("room_id", id)
    .order("created_at", { ascending: true });

  const history = buildHistory((msgs as any[]) ?? []);
  const language = (room.language || "auto") as Lang;
  const followTopic = `${room.topic}\n\nLatest question from a participant: ${body.trim()}`;

  const advices = await runAdvisers(admin, id, {
    topic: followTopic,
    context: room.context || "",
    adviserIds: room.adviser_ids || [],
    language,
    history,
  });

  if (advices.length) {
    await runSynthesis(admin, id, {
      topic: followTopic,
      context: room.context || "",
      advices,
      language,
      history,
    });
  }

  return NextResponse.json({ ok: true });
}
