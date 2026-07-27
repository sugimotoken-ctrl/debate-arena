import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Creates a draft meeting and returns its id. The name + topic + advisers are
// filled in on the console (room page) and saved when the meeting is convened.
export async function POST() {
  const me = await getProfile();
  if (!me || me.status !== "approved") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("rooms")
    .insert({ name: "", owner_id: me.id })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
