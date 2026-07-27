import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getProfile();
  if (!me || me.role !== "admin" || me.status !== "approved") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { userId, action } = (await req.json()) as {
    userId: string;
    action: "approve" | "reject";
  };
  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
