"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADVISERS } from "@/lib/advisers-data";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MicButton, PlayButton } from "./voice";

type Lang = "auto" | "en" | "fa";

interface Msg {
  id: string;
  author_type: string;
  author_id: string;
  author_name: string;
  kind: string;
  body: string;
  bottom_line: string;
  meta: any;
  created_at: string;
}
interface Room {
  id: string;
  name: string;
  topic: string;
  context: string;
  language: Lang;
  adviser_ids: string[];
  convened: boolean;
  owner_id: string;
}

const LANGS: { id: Lang; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "fa", label: "فارسی" },
];

export default function RoomView({
  room,
  initialMessages,
  me,
}: {
  room: Room;
  initialMessages: Msg[];
  me: { id: string; name: string; role: string };
}) {
  const router = useRouter();
  const canManage = me.role === "admin" || room.owner_id === me.id;

  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [convened, setConvened] = useState(room.convened);
  const [name, setName] = useState(room.name);
  const [renaming, setRenaming] = useState(false);

  const [topic, setTopic] = useState(room.topic || "");
  const [context, setContext] = useState(room.context || "");
  const [language, setLanguage] = useState<Lang>(room.language || "auto");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(
      room.adviser_ids?.length
        ? room.adviser_ids
        : ["cfo", "cmo", "coo", "investor", "contrarian"],
    ),
  );

  const [busy, setBusy] = useState<null | "convene" | "ask" | "post">(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const oldId = (payload.old as any)?.id;
          if (oldId) setMessages((prev) => prev.filter((x) => x.id !== oldId));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [room.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function convene() {
    if (!name.trim()) return setError("Name the meeting.");
    if (!topic.trim()) return setError("Enter a topic.");
    if (selected.size === 0) return setError("Pick at least one adviser.");
    setError(null);
    setBusy("convene");
    setConvened(true);
    try {
      const r = await fetch(`/api/rooms/${room.id}/convene`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, topic, context, adviserIds: [...selected], language }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
    } catch (e: any) {
      setError(e?.message || "Failed to convene.");
    } finally {
      setBusy(null);
    }
  }

  async function post() {
    if (!draft.trim()) return;
    setBusy("post");
    try {
      await fetch(`/api/rooms/${room.id}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      setDraft("");
    } finally {
      setBusy(null);
    }
  }

  async function ask() {
    if (!question.trim()) return;
    setBusy("ask");
    const q = question;
    setQuestion("");
    try {
      const r = await fetch(`/api/rooms/${room.id}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: q }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
    } catch (e: any) {
      setError(e?.message || "The council could not respond.");
    } finally {
      setBusy(null);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRenaming(false);
    await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  async function deleteRoom() {
    if (!confirm("Delete this whole meeting room? This cannot be undone.")) return;
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    router.push("/rooms");
    router.refresh();
  }

  async function editMsg(id: string, body: string) {
    setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, body } : x)));
    await fetch(`/api/rooms/${room.id}/message/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
  }

  async function deleteMsg(id: string) {
    setMessages((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/rooms/${room.id}/message/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto px-6 py-6" style={{ maxWidth: 820 }}>
      {convened && (
      <div className="flex items-center gap-2">
        {renaming ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            onBlur={saveName}
            autoFocus
            className="font-display"
            style={{
              fontSize: 28,
              color: "#14141C",
              border: "1.5px solid #6C5CFF",
              borderRadius: 10,
              padding: "2px 8px",
              outline: "none",
            }}
          />
        ) : (
          <h1 className="font-display" style={{ fontSize: 30, color: "#14141C" }}>
            {name}
          </h1>
        )}
        {canManage && !renaming && (
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => setRenaming(true)}
              title="Rename"
              style={iconBtn}
            >
              ✏️
            </button>
            <button onClick={deleteRoom} title="Delete room" style={iconBtn}>
              🗑️
            </button>
          </div>
        )}
      </div>
      )}

      {!convened ? (
        <div
          className="bg-white mt-4 space-y-4"
          style={{
            border: "1px solid rgba(20,20,28,.08)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 20px 50px rgba(20,20,28,.08)",
          }}
        >
          <div>
            <label className="block mb-1" style={labelStyle}>
              Meeting name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this meeting — e.g. Q3 Pricing Decision"
              style={{ ...fieldStyle, width: "100%" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B7B" }}>
              Language:
            </span>
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                style={{
                  fontSize: 13,
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontWeight: 700,
                  border:
                    language === l.id
                      ? "1.5px solid #12B981"
                      : "1.5px solid rgba(20,20,28,.1)",
                  background: language === l.id ? "#E9FBF4" : "#F6F7FB",
                  color: language === l.id ? "#0E9E6E" : "#6B6B7B",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>
              Topic / decision
            </label>
            <div className="flex gap-2">
              <input
                value={topic}
                dir="auto"
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Type, or tap the mic to speak…"
                className="flex-1"
                style={fieldStyle}
              />
              <MicButton
                language={language}
                onText={(t) => setTopic((p) => (p ? p + " " + t : t))}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>
              Context <span style={{ color: "#9A9AAC" }}>(optional)</span>
            </label>
            <div className="flex gap-2">
              <textarea
                value={context}
                dir="auto"
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder="Background for the advisers…"
                className="flex-1"
                style={fieldStyle}
              />
              <MicButton
                language={language}
                onText={(t) => setContext((p) => (p ? p + " " + t : t))}
              />
            </div>
          </div>

          <div>
            <label className="block mb-2" style={labelStyle}>
              Who&apos;s in the room? ({selected.size})
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {ADVISERS.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    className="flex items-center gap-3 text-left transition"
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: on
                        ? `2px solid ${a.color}`
                        : "2px solid rgba(20,20,28,.1)",
                      background: on ? a.tint : "#fff",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{a.emoji}</span>
                    <span style={{ fontSize: 14 }}>
                      <b style={{ color: "#14141C" }}>{a.name}</b>
                      <span style={{ color: "#8A8A9A" }}> · {a.role}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p style={{ color: "#FF4D9D", fontSize: 13 }}>{error}</p>}

          <button
            onClick={convene}
            disabled={busy === "convene"}
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
            {busy === "convene" ? "CONVENING…" : "🏛️ CONVENE MEETING"}
          </button>
        </div>
      ) : (
        <>
          {(topic || room.topic) && (
            <p className="mt-1" style={{ color: "#5C5C6E", fontSize: 15 }} dir="auto">
              {topic || room.topic}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {messages.map((m) => (
              <MessageCard
                key={m.id}
                m={m}
                mine={m.author_id === me.id}
                isAdmin={me.role === "admin"}
                onEdit={editMsg}
                onDelete={deleteMsg}
              />
            ))}
            {busy && (
              <div
                className="text-center animate-pulse"
                style={{ color: "#8A8A9A", fontSize: 14, padding: 8 }}
              >
                {busy === "ask" || busy === "convene"
                  ? "The council is thinking…"
                  : "…"}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="mt-2" style={{ color: "#FF4D9D", fontSize: 13 }}>
              {error}
            </p>
          )}

          <div
            className="bg-white mt-6 space-y-2"
            style={{
              border: "1px solid rgba(108,92,255,.25)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#6C5CFF" }}>
              Ask the council a follow-up
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                dir="auto"
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && ask()}
                placeholder="Pose a new question — advisers will weigh in again…"
                className="flex-1"
                style={fieldStyle}
              />
              <MicButton
                language={language}
                onText={(t) => setQuestion((p) => (p ? p + " " + t : t))}
              />
              <button
                onClick={ask}
                disabled={!!busy}
                className="font-display text-white disabled:opacity-60"
                style={{
                  background: "linear-gradient(92deg,#6C5CFF,#2E7BFF)",
                  borderRadius: 12,
                  padding: "0 20px",
                  fontSize: 15,
                }}
              >
                ASK
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <input
              value={draft}
              dir="auto"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && post()}
              placeholder="Add a comment to the room…"
              className="flex-1"
              style={fieldStyle}
            />
            <MicButton
              language={language}
              onText={(t) => setDraft((p) => (p ? p + " " + t : t))}
            />
            <button
              onClick={post}
              disabled={!!busy}
              style={{
                background: "#F6F7FB",
                color: "#14141C",
                borderRadius: 12,
                padding: "0 20px",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Post
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#3A3A48",
};
const fieldStyle: React.CSSProperties = {
  background: "#F6F7FB",
  border: "1.5px solid rgba(20,20,28,.1)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  color: "#14141C",
  outline: "none",
};
const iconBtn: React.CSSProperties = {
  fontSize: 15,
  background: "#F6F7FB",
  borderRadius: 8,
  padding: "4px 8px",
  lineHeight: 1,
};

function MessageCard({
  m,
  mine,
  isAdmin,
  onEdit,
  onDelete,
}: {
  m: Msg;
  mine: boolean;
  isAdmin: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);

  if (m.kind === "advice") {
    const color = m.meta?.color || "#6C5CFF";
    return (
      <div
        className="bg-white"
        style={{
          border: `1px solid ${color}44`,
          borderRadius: 16,
          padding: 16,
          boxShadow: `0 8px 22px ${color}12`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 20 }}>{m.meta?.emoji}</span>
          <b style={{ color: "#14141C", fontSize: 14 }}>{m.author_name}</b>
          <span style={{ fontSize: 12, color: "#8A8A9A" }}>· {m.meta?.role}</span>
          <span className="ml-auto">
            <PlayButton text={`${m.body}. ${m.bottom_line}`} />
          </span>
        </div>
        <p dir="auto" style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3A48" }}>
          {m.body}
        </p>
        {m.bottom_line && (
          <p
            dir="auto"
            style={{
              fontSize: 14,
              color: "#0E9E6E",
              borderTop: "1px solid rgba(20,20,28,.06)",
              marginTop: 10,
              paddingTop: 8,
            }}
          >
            <span style={{ color: "#8A8A9A" }}>Bottom line: </span>
            {m.bottom_line}
          </p>
        )}
      </div>
    );
  }

  if (m.kind === "synthesis") {
    return (
      <div
        className="bg-white"
        style={{
          border: "1px solid rgba(20,20,28,.1)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 20px 50px rgba(20,20,28,.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <b style={{ color: "#14141C" }}>🪑 Chair&apos;s synthesis</b>
          <span className="ml-auto">
            <PlayButton text={`Recommendation: ${m.body}`} />
          </span>
        </div>
        <div style={{ background: "#F6F7FB", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#8A8A9A", marginBottom: 3 }}>
            Recommendation
          </div>
          <p dir="auto" style={{ fontSize: 14, color: "#14141C" }}>
            {m.body}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3" style={{ fontSize: 13.5 }}>
          <SynthList title="Consensus" color="#0E9E6E" items={m.meta?.consensus} />
          <SynthList title="Tensions" color="#FF9F1C" items={m.meta?.tensions} />
          <SynthList title="Key risks" color="#FF4D9D" items={m.meta?.risks} />
          <SynthList title="Next steps" color="#2E7BFF" items={m.meta?.nextSteps} />
        </div>
      </div>
    );
  }

  // user question or message
  const isQuestion = m.kind === "question";
  return (
    <div
      className={mine ? "ml-auto" : ""}
      style={{
        maxWidth: "85%",
        background: isQuestion ? "#F1EFFF" : mine ? "#EAF2FF" : "#fff",
        border: isQuestion
          ? "1px solid rgba(108,92,255,.3)"
          : "1px solid rgba(20,20,28,.08)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: "#8A8A9A" }}>
          {m.author_name}
          {isQuestion && " · asked the council"}
        </span>
        {(mine || isAdmin) && !editing && (
          <span className="ml-auto flex gap-2">
            {mine && (
              <button
                onClick={() => {
                  setText(m.body);
                  setEditing(true);
                }}
                title="Edit"
                style={{ fontSize: 12, color: "#6C5CFF" }}
              >
                Edit
              </button>
            )}
            <button
              onClick={() => onDelete(m.id)}
              title="Delete"
              style={{ fontSize: 12, color: "#FF4D9D" }}
            >
              Delete
            </button>
          </span>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            value={text}
            dir="auto"
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="flex-1"
            style={{ ...fieldStyle, padding: "8px 10px", fontSize: 14 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEdit(m.id, text.trim());
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button
            onClick={() => {
              onEdit(m.id, text.trim());
              setEditing(false);
            }}
            style={{ fontSize: 13, color: "#0E9E6E", fontWeight: 700 }}
          >
            Save
          </button>
        </div>
      ) : (
        <p dir="auto" style={{ fontSize: 14, color: "#14141C" }}>
          {m.body}
        </p>
      )}
    </div>
  );
}

function SynthList({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div style={{ color, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
        {title}
      </div>
      <ul dir="auto" className="list-disc list-inside space-y-1" style={{ color: "#3A3A48" }}>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
