"use client";

import { useState } from "react";

interface Row {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

export default function AdminList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(userId: string, action: "approve" | "reject") {
    setBusy(userId);
    try {
      const r = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const j = await r.json();
      if (j.ok) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === userId ? { ...row, status: j.status } : row,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  }

  const badge: Record<string, string> = {
    pending: "#FF9F1C",
    approved: "#12B981",
    rejected: "#FF4D9D",
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p style={{ color: "#9A9AAC", fontSize: 14 }}>No members yet.</p>
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          className="bg-white flex items-center gap-3"
          style={{
            border: "1px solid rgba(20,20,28,.08)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div className="min-w-0 flex-1">
            <div style={{ fontWeight: 700, color: "#14141C" }}>
              {row.full_name || "—"}{" "}
              {row.role === "admin" && (
                <span style={{ fontSize: 11, color: "#6C5CFF" }}>· admin</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#8A8A9A" }}>{row.email}</div>
          </div>
          <span
            className="rounded-full"
            style={{
              background: `${badge[row.status]}22`,
              color: badge[row.status],
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
            }}
          >
            {row.status}
          </span>
          {row.role !== "admin" && (
            <div className="flex gap-2">
              {row.status !== "approved" && (
                <button
                  onClick={() => act(row.id, "approve")}
                  disabled={busy === row.id}
                  className="text-white"
                  style={{
                    background: "#12B981",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Approve
                </button>
              )}
              {row.status !== "rejected" && (
                <button
                  onClick={() => act(row.id, "reject")}
                  disabled={busy === row.id}
                  style={{
                    background: "#F6F7FB",
                    color: "#FF4D9D",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
