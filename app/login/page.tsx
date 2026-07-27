"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice(
            "Account created. If email confirmation is on, confirm via the email, then sign in.",
          );
          setMode("signin");
          return;
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/rooms");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto px-6"
      style={{ maxWidth: 440, paddingTop: 60, paddingBottom: 80 }}
    >
      <h1
        className="font-display brand-text uppercase text-center"
        style={{ fontSize: 44, letterSpacing: 1 }}
      >
        Debate Arena
      </h1>
      <p className="text-center mt-2" style={{ color: "#5C5C6E", fontSize: 15 }}>
        {mode === "signin" ? "Sign in to your rooms" : "Create your account"}
      </p>

      <form
        onSubmit={submit}
        className="bg-white mt-6 space-y-3"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 20px 50px rgba(20,20,28,.08)",
        }}
      >
        {mode === "signup" && (
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="field"
              required
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field"
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field"
            minLength={6}
            required
          />
        </Field>

        {error && (
          <p style={{ color: "#FF4D9D", fontSize: 13 }}>{error}</p>
        )}
        {notice && (
          <p style={{ color: "#0E9E6E", fontSize: 13 }}>{notice}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="font-display text-white w-full disabled:opacity-60"
          style={{
            background: "linear-gradient(92deg,#6C5CFF,#2E7BFF)",
            borderRadius: 14,
            padding: "13px",
            fontSize: 17,
            letterSpacing: 1,
          }}
        >
          {busy ? "…" : mode === "signin" ? "SIGN IN" : "SIGN UP"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="w-full text-center"
          style={{ color: "#6C5CFF", fontSize: 14, fontWeight: 600 }}
        >
          {mode === "signin"
            ? "No account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>

      <p
        className="text-center mt-4"
        style={{ color: "#9A9AAC", fontSize: 12.5 }}
      >
        New accounts need admin approval before joining rooms.
      </p>

      <style jsx>{`
        .field {
          width: 100%;
          background: #f6f7fb;
          border: 1.5px solid rgba(20, 20, 28, 0.1);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 15px;
          color: #14141c;
          outline: none;
        }
        .field:focus {
          border-color: #6c5cff;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block mb-1"
        style={{ fontSize: 13, fontWeight: 600, color: "#3A3A48" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
