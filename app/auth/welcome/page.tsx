"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function Welcome() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const sb = supabaseBrowser();
    const next = params.get("next") || "/rooms";

    async function go() {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session) {
        router.push(next);
        router.refresh();
        return true;
      }
      return false;
    }

    let done = false;
    go().then((ok) => (done = ok));

    // The session may be established slightly after mount (URL processing).
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      if (s && !done) {
        done = true;
        router.push(next);
        router.refresh();
      }
    });

    const t = setTimeout(() => {
      if (!done)
        setMsg(
          "Almost there — please finish signing in to continue to your meeting.",
        );
    }, 3500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [params, router]);

  return (
    <div className="text-center" style={{ paddingTop: 120 }}>
      <div style={{ fontSize: 40 }}>🏛️</div>
      <p className="mt-3" style={{ color: "#5C5C6E", fontSize: 16 }}>
        {msg}
      </p>
      <a
        href="/login"
        className="inline-block mt-4"
        style={{ color: "#6C5CFF", fontWeight: 600 }}
      >
        Go to sign in
      </a>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div style={{ paddingTop: 120, textAlign: "center" }}>…</div>}>
      <Welcome />
    </Suspense>
  );
}
