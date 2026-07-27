import { createClient } from "@supabase/supabase-js";

/** Server-only client using the secret key. Bypasses RLS — never expose. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
