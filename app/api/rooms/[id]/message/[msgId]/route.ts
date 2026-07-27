import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Only the author may edit their own message; author or admin may delete it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved")
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { msgId } = await params;
  const { body } = (await req.json()) as { body: string };
  if (!body?.trim())
    return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: msg } = await admin
    .from("messages")
    .select("author_type,author_id")
    .eq("id", msgId)
    .single();
  if (!msg) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (msg.author_type !== "user" || msg.author_id !== me.id)
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { error } = await admin
    .from("messages")
    .update({ body: body.trim() })
    .eq("id", msgId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved")
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { msgId } = await params;

  const admin = supabaseAdmin();
  const { data: msg } = await admin
    .from("messages")
    .select("author_type,author_id")
    .eq("id", msgId)
    .single();
  if (!msg) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const mine = msg.author_type === "user" && msg.author_id === me.id;
  if (!mine && me.role !== "admin")
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { error } = await admin.from("messages").delete().eq("id", msgId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
