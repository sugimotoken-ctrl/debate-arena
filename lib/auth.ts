import { supabaseServer } from "./supabase/server";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
}

/** Current user's profile (or null if not signed in). */
export async function getProfile(): Promise<Profile | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("id,email,full_name,role,status")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}
