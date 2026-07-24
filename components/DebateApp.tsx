"use client";

import { useEffect, useRef, useState } from "react";
import DebateBoard from "./DebateBoard";
import DebateHistory from "./DebateHistory";
import {
  addToHistory,
  clearHistory,
  getHistory,
  removeFromHistory,
} from "@/lib/history";
import type {
  Debate,
  DebateConfig,
  FinalSummary,
  Moderation,
  Turn,
  Verdict,
} from "@/lib/types";

const MAX_ROUNDS = 4;
const THRESHOLD = 80;

function personaFrom(name: string, role: string): string | undefined {
  const n = name.trim();
  const r = role.trim();
  if (!n && !r) return undefined;
  return `You are ${n || "an expert debater"}${
    r ? `, ${r}` : ""
  }. Debate in character, drawing on that background and expertise.`;
}

export default function DebateApp({
  onSwitchToCouncil,
}: {
  onSwitchToCouncil?: () => void;
}) {
  // Motion + editable debaters
  const [motion, setMotion] = useState("");
  const [nameA, setNameA] = useState("");
  const [roleA, setRoleA] = useState("");
  const [photoA, setPhotoA] = useState<string | null>(null);
  const [nameB, setNameB] = useState("");
  const [roleB, setRoleB] = useState("");
  const [photoB, setPhotoB] = useState<string | null>(null);

  // Debate run state
  const [turns, setTurns] = useState<Turn[]>([]);
  const [moderations, setModerations] = useState<Moderation[]>([]);
  const [verdict, setVerdict] = useState<Verdict>("ongoing");
  const [summary, setSummary] = useState<FinalSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<Debate[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const config: DebateConfig = {
    topic: motion.trim(),
    stanceA: `Argue FOR the motion: "${motion.trim()}".`,
    stanceB: `Argue AGAINST the motion: "${motion.trim()}".`,
    personaA: personaFrom(nameA, roleA),
    personaB: personaFrom(nameB, roleB),
    maxRounds: MAX_ROUNDS,
    agreementThreshold: THRESHOLD,
  };

  async function run() {
    if (!motion.trim()) {
      setError("Enter the motion to debate.");
      return;
    }
    setError(null);
    setStarted(true);
    setRunning(true);
    setTurns([]);
    setModerations([]);
    setSummary(null);
    setShareId(null);
    setVerdict("ongoing");

    let acc: Turn[] = [];
    const mods: Moderation[] = [];
    let finalVerdict: Verdict = "timeout";
    let anyMock = false;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await fetch("/api/debate/round", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config, priorTurns: acc, round }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Round ${round + 1} failed`);
        }
        const data = (await res.json()) as {
          turns: Turn[];
          moderation: Moderation;
          mock: boolean;
        };

        acc = [...acc, ...data.turns];
        mods.push(data.moderation);
        anyMock = anyMock || data.mock;

        setTurns([...acc]);
        setModerations([...mods]);
        setMock(anyMock);

        if (data.moderation.verdict === "converged") {
          finalVerdict = "converged";
          break;
        }
        if (data.moderation.verdict === "impasse") {
          finalVerdict = "impasse";
          break;
        }
        if (round === MAX_ROUNDS - 1) finalVerdict = "timeout";
      }

      setVerdict(finalVerdict);

      const sumRes = await fetch("/api/debate/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config, turns: acc, verdict: finalVerdict }),
      });
      const sumData = await sumRes.json();
      const finalSummary: FinalSummary | null = sumData.summary ?? null;
      setSummary(finalSummary);

      const saveRes = await fetch("/api/debate/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          debate: {
            config,
            turns: acc,
            moderations: mods,
            summary: finalSummary,
            verdict: finalVerdict,
            createdAt: Date.now(),
            mock: anyMock,
          },
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (saveData.id) setShareId(saveData.id);

      const localId: string =
        saveData.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()));
      const record: Debate = {
        id: localId,
        config,
        turns: acc,
        moderations: mods,
        summary: finalSummary,
        verdict: finalVerdict,
        createdAt: Date.now(),
        mock: anyMock,
        shared: !!saveData.id,
      };
      setHistory(addToHistory(record));
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto px-10 pb-20" style={{ maxWidth: 1000 }}>
      {/* Hero */}
      <div className="text-center">
        <span
          className="inline-block"
          style={{
            background: "#fff",
            border: "1px solid rgba(255,107,74,.35)",
            color: "#FF6B4A",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 2.5,
            padding: "8px 18px",
            borderRadius: 999,
            boxShadow: "0 4px 14px rgba(255,107,74,.12)",
          }}
        >
          TWO PROFESSIONALS · HEAD TO HEAD
        </span>
        <h1
          className="font-display uppercase mx-auto mt-4"
          style={{
            fontSize: "clamp(48px,8vw,104px)",
            letterSpacing: 1,
            lineHeight: 0.92,
            background:
              "linear-gradient(92deg,#FF6B4A,#FF9F1C 45%,#6C5CFF)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          The Debate.
        </h1>
        <p
          className="mx-auto mt-3"
          style={{
            maxWidth: 560,
            fontSize: 18,
            lineHeight: 1.55,
            color: "#5C5C6E",
          }}
        >
          Two professionals take opposite sides of your topic and argue it out,
          round by round, while a neutral moderator scores the exchange.
        </p>
      </div>

      {/* Debater cards */}
      <div
        className="mt-8 items-stretch"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 18,
        }}
      >
        <DebaterCard
          side="A"
          name={nameA}
          role={roleA}
          photo={photoA}
          onName={setNameA}
          onRole={setRoleA}
          onPhoto={setPhotoA}
        />

        {/* VS medallion */}
        <div className="self-center grid place-items-center relative" style={{ width: 82, height: 82 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg,#FF6B4A,#FF9F1C,#6C5CFF,#FF6B4A)",
              animation: "spin360 8s linear infinite",
            }}
          />
          <div
            className="absolute grid place-items-center rounded-full font-display"
            style={{ inset: 4, background: "#fff", fontSize: 32, color: "#14141C" }}
          >
            VS
          </div>
        </div>

        <DebaterCard
          side="B"
          name={nameB}
          role={roleB}
          photo={photoB}
          onName={setNameB}
          onRole={setRoleB}
          onPhoto={setPhotoB}
        />
      </div>

      {/* Motion card */}
      <div
        className="bg-white mt-[22px]"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 24,
          padding: 30,
          boxShadow: "0 24px 60px rgba(20,20,28,.10)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#6B6B7B",
            letterSpacing: 0.5,
            marginBottom: 10,
          }}
        >
          THE MOTION
        </div>
        <div className="flex gap-3">
          <input
            value={motion}
            dir="auto"
            onChange={(e) => setMotion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !running) run();
            }}
            placeholder="e.g. This house believes remote work is better for society"
            className="flex-1 focus:outline-none"
            style={{
              background: "#F6F7FB",
              border: "1.5px solid rgba(20,20,28,.1)",
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 500,
              padding: "16px 18px",
              color: "#14141C",
            }}
          />
          <button
            onClick={run}
            disabled={running}
            className="font-display text-white disabled:opacity-60"
            style={{
              fontSize: 17,
              letterSpacing: 1,
              background: "linear-gradient(92deg,#FF6B4A,#FF9F1C)",
              borderRadius: 14,
              padding: "0 26px",
            }}
          >
            {running ? "DEBATING…" : "START →"}
          </button>
        </div>
        {error && (
          <p className="mt-3" style={{ color: "#FF4D9D", fontSize: 14 }}>
            {error}
          </p>
        )}
        <div className="mt-[18px]" style={{ fontSize: 14, color: "#9A9AAC" }}>
          Need a full board instead of a duel? Switch to the{" "}
          <button
            onClick={onSwitchToCouncil}
            className="font-semibold"
            style={{ color: "#6C5CFF" }}
          >
            🏛️ Council
          </button>
          .
        </div>
        {shareId && (
          <p className="mt-2" style={{ fontSize: 14, color: "#0E9E6E" }}>
            Saved ·{" "}
            <a className="underline" href={`/debate/${shareId}`}>
              shareable link
            </a>
          </p>
        )}
      </div>

      {/* Results */}
      {started && (
        <div className="mt-8">
          <DebateBoard
            config={config}
            turns={turns}
            moderations={moderations}
            summary={summary}
            verdict={verdict}
            running={running}
            mock={mock}
          />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-10">
          <DebateHistory
            items={history}
            onDelete={(id) => setHistory(removeFromHistory(id))}
            onClear={() => setHistory(clearHistory())}
          />
        </div>
      )}
    </div>
  );
}

// ---------- Editable debater card ----------

function DebaterCard({
  side,
  name,
  role,
  photo,
  onName,
  onRole,
  onPhoto,
}: {
  side: "A" | "B";
  name: string;
  role: string;
  photo: string | null;
  onName: (v: string) => void;
  onRole: (v: string) => void;
  onPhoto: (v: string | null) => void;
}) {
  const isA = side === "A";
  const accent = isA ? "#FF6B4A" : "#6C5CFF";
  const tint = isA ? "#FFF1EC" : "#F1EFFF";
  const border = isA ? "rgba(255,107,74,.3)" : "rgba(108,92,255,.3)";
  const shadow = isA ? "rgba(255,107,74,.12)" : "rgba(108,92,255,.12)";
  const stance = isA ? "👍 FOR THE MOTION" : "👎 AGAINST THE MOTION";
  const namePlaceholder = isA
    ? "Name — e.g. Dr. Ada Chen"
    : "Name — e.g. Marcus Reed";

  return (
    <div
      className="bg-white"
      style={{
        border: `1px solid ${border}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: `0 18px 40px ${shadow}`,
      }}
    >
      <ImageSlot
        photo={photo}
        onPhoto={onPhoto}
        tint={tint}
        accent={accent}
        placeholder={`Drop a photo of Debater ${side}`}
      />

      <span
        className="inline-flex items-center mt-4"
        style={{
          background: tint,
          color: accent,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 1,
          padding: "6px 12px",
          borderRadius: 999,
        }}
      >
        {stance}
      </span>

      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder={namePlaceholder}
        className="block w-full bg-transparent focus:outline-none mt-3"
        style={{ fontWeight: 700, fontSize: 20, color: "#14141C" }}
      />
      <input
        value={role}
        onChange={(e) => onRole(e.target.value)}
        placeholder="Title / expertise"
        className="block w-full bg-transparent focus:outline-none mt-1"
        style={{ fontWeight: 500, fontSize: 14, color: "#8A8A9A" }}
      />
    </div>
  );
}

function ImageSlot({
  photo,
  onPhoto,
  tint,
  accent,
  placeholder,
}: {
  photo: string | null;
  onPhoto: (v: string | null) => void;
  tint: string;
  accent: string;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFile(f?: File | null) {
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onPhoto(String(reader.result));
    reader.readAsDataURL(f);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className="relative w-full cursor-pointer overflow-hidden grid place-items-center text-center group"
      style={{
        height: 220,
        borderRadius: 16,
        background: tint,
        outline: drag ? `2px dashed ${accent}` : "none",
      }}
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover" }}
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition grid place-items-center bg-black/35">
            <span className="text-white text-sm font-semibold">Change photo</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPhoto(null);
            }}
            className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-black/45 text-white text-xs opacity-0 group-hover:opacity-100 transition"
            title="Remove photo"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="px-4" style={{ color: "#9A9AAC", fontSize: 14 }}>
          {placeholder}
          <span className="block text-xs mt-1" style={{ color: "#B8B8C6" }}>
            click or drop an image
          </span>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
