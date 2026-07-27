"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  topic: string;
  convened: boolean;
  owner_id: string;
  updated_at: string;
}

export default function RoomsList({
  initial,
  me,
}: {
  initial: Room[];
  me: { id: string; role: string };
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startNew() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/rooms/create", { method: "POST" });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      router.push(`/rooms/${j.id}`);
    } catch (e: any) {
      setError(e?.message || "Could not start a meeting.");
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    setRooms((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={startNew}
        disabled={busy}
        className="font-display text-white disabled:opacity-60"
        style={{
          background:
            "linear-gradient(92deg,#FF6B4A,#FF9F1C 24%,#12B981 48%,#2E7BFF 72%,#6C5CFF)",
          borderRadius: 14,
          padding: "14px 26px",
          fontSize: 18,
          letterSpacing: 1,
        }}
      >
        {busy ? "…" : "🏛️ NEW MEETING"}
      </button>
      {error && <p style={{ color: "#FF4D9D", fontSize: 13 }}>{error}</p>}

      <div className="space-y-2">
        {rooms.length === 0 && (
          <p style={{ color: "#9A9AAC", fontSize: 14 }}>
            No meetings yet — start one above.
          </p>
        )}
        {rooms.map((room) => {
          const canDelete = me.role === "admin" || room.owner_id === me.id;
          return (
            <div
              key={room.id}
              className="bg-white flex items-center gap-3"
              style={{
                border: "1px solid rgba(20,20,28,.08)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <Link
                href={`/rooms/${room.id}`}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80"
              >
                <span style={{ fontSize: 22 }}>🏛️</span>
                <div className="min-w-0 flex-1">
                  <div style={{ fontWeight: 700, color: "#14141C" }}>
                    {room.name || "Untitled meeting"}
                  </div>
                  <div style={{ fontSize: 13, color: "#8A8A9A" }} className="truncate">
                    {room.topic || "Draft — not convened yet"}
                  </div>
                </div>
              </Link>
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
                {room.convened ? "Saved" : "Draft"}
              </span>
              {canDelete && (
                <button
                  onClick={() => del(room.id)}
                  title="Delete meeting"
                  style={{
                    fontSize: 15,
                    background: "#F6F7FB",
                    borderRadius: 8,
                    padding: "6px 9px",
                    lineHeight: 1,
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
