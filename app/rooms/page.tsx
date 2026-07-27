import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import GatedHeader from "@/components/GatedHeader";
import RoomsList from "@/components/RoomsList";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");

  const sb = await supabaseServer();
  const { data } = await sb
    .from("rooms")
    .select("id,name,topic,convened,owner_id,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <GatedHeader profile={profile} />
      <div className="mx-auto px-6 py-8" style={{ maxWidth: 760 }}>
        <h1 className="font-display" style={{ fontSize: 40, color: "#14141C" }}>
          Meeting Rooms
        </h1>
        <p className="mb-6" style={{ color: "#5C5C6E", fontSize: 15 }}>
          Name a meeting, convene the council, and reopen it anytime to continue.
        </p>
        <RoomsList
          initial={(data as any[]) ?? []}
          me={{ id: profile.id, role: profile.role }}
        />
      </div>
    </>
  );
}
