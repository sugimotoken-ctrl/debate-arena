"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      style={{ color: "#6B6B7B", fontSize: 13, fontWeight: 600 }}
      className="hover:opacity-70"
    >
      Sign out
    </button>
  );
}
