"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  topic: string;
  convened: boolean;
  updated_at: string;
}

export default function RoomsList({ initial }: { initial: Room[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Give the meeting a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      router.push(`/rooms/${j.id}`);
    } catch (e: any) {
      setError(e?.message || "Could not create the room.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="bg-white flex gap-2"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 10px 26px rgba(20,20,28,.05)",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Name this meeting — e.g. Q3 Pricing Decision"
          className="flex-1"
          style={{
            background: "#F6F7FB",
            border: "1.5px solid rgba(20,20,28,.1)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 15,
            color: "#14141C",
            outline: "none",
          }}
        />
        <button
          onClick={create}
          disabled={busy}
          className="font-display text-white disabled:opacity-60"
          style={{
            background: "linear-gradient(92deg,#6C5CFF,#2E7BFF)",
            borderRadius: 12,
            padding: "0 22px",
            fontSize: 16,
            letterSpacing: 0.5,
          }}
        >
          {busy ? "…" : "+ NEW"}
        </button>
      </div>
      {error && <p style={{ color: "#FF4D9D", fontSize: 13 }}>{error}</p>}

      <div className="space-y-2">
        {initial.length === 0 && (
          <p style={{ color: "#9A9AAC", fontSize: 14 }}>
            No meetings yet — name one above to get started.
          </p>
        )}
        {initial.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="bg-white flex items-center gap-3 hover:shadow-md transition"
            style={{
              border: "1px solid rgba(20,20,28,.08)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <span style={{ fontSize: 22 }}>🏛️</span>
            <div className="min-w-0 flex-1">
              <div style={{ fontWeight: 700, color: "#14141C" }}>
                {room.name}
              </div>
              <div
                style={{ fontSize: 13, color: "#8A8A9A" }}
                className="truncate"
              >
                {room.topic || "Not convened yet"}
              </div>
            </div>
            <span
              className="rounded-full"
              style={{
                background: room.convened ? "#E9FBF4" : "#F6F7FB",
                color: room.convened ? "#0E9E6E" : "#8A8A9A",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 10px",
              }}
            >
              {room.convened ? "Active" : "New"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
