import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GatedHeader from "@/components/GatedHeader";
import RoomView from "@/components/RoomView";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");

  const { id } = await params;
  const sb = await supabaseServer();

  const { data: room } = await sb
    .from("rooms")
    .select("id,name,topic,context,language,adviser_ids,convened,owner_id")
    .eq("id", id)
    .single();
  if (!room) notFound();

  const { data: messages } = await sb
    .from("messages")
    .select("id,author_type,author_id,author_name,kind,body,bottom_line,meta,created_at")
    .eq("room_id", id)
    .order("created_at", { ascending: true });

  // Participant names need cross-user profile reads → use the admin client
  // (the viewer already passed the RLS membership check by loading the room).
  const admin = supabaseAdmin();
  const [{ data: owner }, { data: parts }] = await Promise.all([
    admin.from("profiles").select("full_name,email").eq("id", room.owner_id).single(),
    admin
      .from("room_participants")
      .select("user_id, profiles:user_id (full_name,email)")
      .eq("room_id", id),
  ]);

  const participants = [
    {
      name: owner?.full_name || owner?.email || "Owner",
      isOwner: true,
    },
    ...((parts as any[]) ?? [])
      .filter((p) => p.user_id !== room.owner_id)
      .map((p) => ({
        name: p.profiles?.full_name || p.profiles?.email || "Member",
        isOwner: false,
      })),
  ];

  return (
    <>
      <GatedHeader profile={profile} />
      <RoomView
        room={room as any}
        initialMessages={(messages as any[]) ?? []}
        participants={participants}
        me={{
          id: profile.id,
          name: profile.full_name || profile.email,
          role: profile.role,
        }}
      />
    </>
  );
}
