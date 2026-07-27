import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getProfile();
  if (!me || me.status !== "approved")
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { id } = await params;
  const { query } = (await req.json()) as { query: string };
  const q = (query || "").trim();
  if (!q)
    return NextResponse.json({ error: "Enter a name or email." }, { status: 400 });

  const admin = supabaseAdmin();

  // Only the room owner or an admin may invite.
  const { data: room } = await admin
    .from("rooms")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!room)
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.owner_id !== me.id && me.role !== "admin")
    return NextResponse.json({ error: "Only the host or an admin can invite." }, {
      status: 403,
    });

  // 1) Try to match an existing member by email or name.
  const { data: matches } = await admin
    .from("profiles")
    .select("id,email,full_name")
    .or(`email.ilike.${q},full_name.ilike.${q}`)
    .limit(1);
  const existing = matches && matches[0];

  if (existing) {
    await admin
      .from("room_participants")
      .upsert({ room_id: id, user_id: existing.id });
    return NextResponse.json({
      ok: true,
      kind: "member",
      who: existing.full_name || existing.email,
    });
  }

  // 2) Not a member — must be an email to invite someone new.
  if (!isEmail(q))
    return NextResponse.json(
      { error: `No member found matching "${q}". To invite someone new, enter their email address.` },
      { status: 400 },
    );

  const redirectTo = `${siteUrl(req)}/auth/welcome?next=${encodeURIComponent(`/rooms/${id}`)}`;
  const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(
    q,
    { redirectTo },
  );

  let userId = inv?.user?.id;
  if (invErr) {
    // Already registered (e.g. previously invited) — look them up and just add.
    const { data: p2 } = await admin
      .from("profiles")
      .select("id")
      .eq("email", q)
      .maybeSingle();
    if (p2) userId = p2.id;
    else
      return NextResponse.json(
        { error: invErr.message || "Could not send the invite." },
        { status: 500 },
      );
  }
  if (!userId)
    return NextResponse.json({ error: "Invite failed." }, { status: 500 });

  // Auto-approve invited users and seat them in this room.
  await admin.from("profiles").update({ status: "approved" }).eq("id", userId);
  await admin.from("room_participants").upsert({ room_id: id, user_id: userId });

  return NextResponse.json({ ok: true, kind: "email", who: q });
}
