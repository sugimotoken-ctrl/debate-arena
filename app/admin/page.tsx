import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import GatedHeader from "@/components/GatedHeader";
import AdminList from "@/components/AdminList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" || profile.status !== "approved")
    redirect("/rooms");

  const sb = await supabaseServer();
  const { data } = await sb
    .from("profiles")
    .select("id,email,full_name,role,status")
    .order("created_at", { ascending: false });

  const rows = (data as any[]) ?? [];
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <GatedHeader profile={profile} />
      <div className="mx-auto px-6 py-8" style={{ maxWidth: 720 }}>
        <h1 className="font-display" style={{ fontSize: 34, color: "#14141C" }}>
          Members
        </h1>
        <p className="mb-5" style={{ color: "#5C5C6E", fontSize: 15 }}>
          {pendingCount > 0
            ? `${pendingCount} awaiting approval.`
            : "Everyone is reviewed."}
        </p>
        <AdminList initial={rows} />
      </div>
    </>
  );
}
