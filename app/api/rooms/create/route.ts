import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getProfile();
  if (!me || me.status !== "approved") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name the meeting." }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("rooms")
    .insert({ name: name.trim(), owner_id: me.id })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
