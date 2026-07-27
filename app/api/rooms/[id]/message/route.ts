import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { error } = await sb.from("messages").insert({
    room_id: id,
    author_type: "user",
    author_id: me.id,
    author_name: me.full_name || me.email,
    kind: "message",
    body: body.trim(),
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
