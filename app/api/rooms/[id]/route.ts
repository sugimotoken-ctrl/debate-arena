import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function canManage(id: string, meId: string, isAdmin: boolean) {
  const admin = supabaseAdmin();
  const { data: room } = await admin
    .from("rooms")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!room) return { ok: false, code: 404 as const };
  if (room.owner_id !== meId && !isAdmin) return { ok: false, code: 403 as const };
  return { ok: true as const };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved")
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim())
    return NextResponse.json({ error: "Name required." }, { status: 400 });

  const chk = await canManage(id, me.id, me.role === "admin");
  if (!chk.ok)
    return NextResponse.json({ error: "Not allowed." }, { status: chk.code });

  const { error } = await supabaseAdmin()
    .from("rooms")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved")
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;

  const chk = await canManage(id, me.id, me.role === "admin");
  if (!chk.ok)
    return NextResponse.json({ error: "Not allowed." }, { status: chk.code });

  const { error } = await supabaseAdmin().from("rooms").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
