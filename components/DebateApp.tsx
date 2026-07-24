"use client";

import { useEffect, useState } from "react";
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

const EXAMPLES = [
  {
    topic: "Remote work is better for society",
    stanceA: "Remote work is better for society.",
    stanceB: "Office work is better for society.",
  },
  {
    topic: "AI development should be paused until safety is solved",
    stanceA: "AI development should be paused until safety is solved.",
    stanceB: "AI development should continue without a pause.",
  },
  {
    topic: "A four-day work week should be the default",
    stanceA: "A four-day work week improves outcomes for everyone.",
    stanceB: "A five-day work week remains the better default.",
  },
];

export default function DebateApp({
  onSwitchToCouncil,
}: {
  onSwitchToCouncil?: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [stanceA, setStanceA] = useState("");
  const [stanceB, setStanceB] = useState("");
  const [maxRounds, setMaxRounds] = useState(4);
  const [threshold, setThreshold] = useState(80);

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
    topic: topic.trim(),
    stanceA: stanceA.trim(),
    stanceB: stanceB.trim(),
    maxRounds,
    agreementThreshold: threshold,
  };

  function loadExample(i: number) {
    setTopic(EXAMPLES[i].topic);
    setStanceA(EXAMPLES[i].stanceA);
    setStanceB(EXAMPLES[i].stanceB);
  }

  async function run() {
    if (!config.topic || !config.stanceA || !config.stanceB) {
      setError("Fill in the motion and both positions.");
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
      for (let round = 0; round < maxRounds; round++) {
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
        if (round === maxRounds - 1) {
          finalVerdict = "timeout";
        }
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

  function swapAndRerun() {
    setStanceA(stanceB);
    setStanceB(stanceA);
    setTimeout(run, 50);
  }

  return (
    <div className="mx-auto px-10 pb-20" style={{ maxWidth: 1000 }}>
      {/* Hero */}
      <div className="text-center">
        <span
          className="inline-block rounded-full"
          style={{
            background: "#fff",
            border: "1px solid rgba(255,107,74,.35)",
            color: "#FF6B4A",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 2.5,
            padding: "6px 14px",
          }}
        >
          TWO MODELS · HEAD TO HEAD
        </span>
        <h1
          className="font-display uppercase mx-auto mt-4"
          style={{
            fontSize: "clamp(48px,8vw,104px)",
            lineHeight: 0.92,
            background: "linear-gradient(92deg,#FF6B4A,#FF9F1C 45%,#6C5CFF)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          The Debate.
        </h1>
        <p
          className="mx-auto mt-3"
          style={{ maxWidth: 560, fontSize: 18, color: "#5C5C6E", lineHeight: 1.55 }}
        >
          Two models take opposite sides of your motion and argue it out, round
          by round, while a neutral moderator scores the exchange.
        </p>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 justify-center mt-5">
        {EXAMPLES.map((e, i) => (
          <button
            key={i}
            onClick={() => loadExample(i)}
            className="rounded-full"
            style={{
              padding: "5px 12px",
              fontSize: 12.5,
              background: "#fff",
              border: "1px solid rgba(20,20,28,.1)",
              color: "#6B6B7B",
            }}
          >
            {e.topic}
          </button>
        ))}
      </div>

      {/* Debater cards */}
      <div
        className="grid items-stretch gap-4 mt-6"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <DebaterCard
          color="#FF6B4A"
          tint="#FFF1EC"
          stancePill="👍 SIDE A · FOR"
          model="Claude Opus 4.8"
          org="Anthropic"
          emoji="⚖️"
          stance={stanceA}
          onStance={setStanceA}
          placeholder="The position Claude argues for"
        />
        <div className="self-center grid place-items-center relative" style={{ width: 82, height: 82 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg,#FF6B4A,#FF9F1C,#6C5CFF,#FF6B4A)",
              animation: "spin360 8s linear infinite",
            }}
          />
          <div
            className="absolute grid place-items-center rounded-full font-display"
            style={{ inset: 4, background: "#fff", fontSize: 30 }}
          >
            VS
          </div>
        </div>
        <DebaterCard
          color="#6C5CFF"
          tint="#F1EFFF"
          stancePill="👎 SIDE B · AGAINST"
          model="GPT-5.5 Thinking"
          org="OpenAI"
          emoji="🤖"
          stance={stanceB}
          onStance={setStanceB}
          placeholder="The opposing position GPT argues for"
        />
      </div>

      {/* Motion card */}
      <div
        className="bg-white mt-5"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 24,
          padding: 30,
          boxShadow: "0 24px 60px rgba(20,20,28,.10)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#6B6B7B", letterSpacing: 0.5 }}>
          THE MOTION
        </div>
        <div className="flex gap-3 mt-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. This house believes remote work is better for society"
            className="flex-1 outline-none"
            style={{
              background: "#F6F7FB",
              border: "1.5px solid rgba(20,20,28,.1)",
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 16,
            }}
          />
          <button
            onClick={run}
            disabled={running}
            className="debate-fill font-display disabled:opacity-60"
            style={{
              fontSize: 17,
              letterSpacing: 1,
              color: "#fff",
              borderRadius: 14,
              padding: "0 26px",
            }}
          >
            {running ? "…" : "START →"}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-6 mt-4">
          <label style={{ fontSize: 13, color: "#6B6B7B" }}>
            Rounds: <b style={{ color: "#14141C" }}>{maxRounds}</b>
            <input
              type="range"
              min={2}
              max={8}
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              className="ml-2 align-middle"
            />
          </label>
          <label style={{ fontSize: 13, color: "#6B6B7B" }}>
            Agreement threshold: <b style={{ color: "#14141C" }}>{threshold}%</b>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="ml-2 align-middle"
            />
          </label>
          {started && !running && (
            <button
              onClick={swapAndRerun}
              className="rounded-lg"
              style={{
                padding: "7px 14px",
                fontSize: 13,
                background: "#F6F7FB",
                border: "1px solid rgba(20,20,28,.1)",
                color: "#3A3A48",
              }}
            >
              ⇄ Swap &amp; rematch
            </button>
          )}
        </div>

        {error && <p style={{ color: "#FF6B4A", fontSize: 14, marginTop: 10 }}>{error}</p>}
        {shareId && (
          <p style={{ fontSize: 14, marginTop: 10, color: "#0E9E6E" }}>
            Saved ·{" "}
            <a className="underline" href={`/debate/${shareId}`}>
              shareable link
            </a>
          </p>
        )}
        <p style={{ fontSize: 13.5, color: "#9A9AAC", marginTop: 12 }}>
          Need a full board instead of a duel?{" "}
          <button
            onClick={onSwitchToCouncil}
            className="underline"
            style={{ color: "#6C5CFF", fontWeight: 600 }}
          >
            Switch to the 🏛️ Council
          </button>
          .
        </p>
      </div>

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

      <div className="mt-8">
        <DebateHistory
          items={history}
          onDelete={(id) => setHistory(removeFromHistory(id))}
          onClear={() => setHistory(clearHistory())}
        />
      </div>
    </div>
  );
}

function DebaterCard({
  color,
  tint,
  stancePill,
  model,
  org,
  emoji,
  stance,
  onStance,
  placeholder,
}: {
  color: string;
  tint: string;
  stancePill: string;
  model: string;
  org: string;
  emoji: string;
  stance: string;
  onStance: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div
      className="bg-white flex flex-col gap-3"
      style={{
        border: `1px solid ${color}4d`,
        borderRadius: 24,
        padding: 20,
        boxShadow: `0 18px 40px ${color}1f`,
      }}
    >
      <div
        className="grid place-items-center"
        style={{ height: 130, borderRadius: 16, background: tint }}
      >
        <div style={{ fontSize: 46 }}>{emoji}</div>
      </div>
      <span
        className="self-start rounded-full"
        style={{
          background: tint,
          color,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 1,
          padding: "5px 12px",
        }}
      >
        {stancePill}
      </span>
      <div style={{ fontWeight: 700, fontSize: 20, color: "#14141C" }}>{model}</div>
      <div style={{ fontSize: 14, color: "#8A8A9A", marginTop: -8 }}>{org}</div>
      <textarea
        value={stance}
        onChange={(e) => onStance(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="outline-none resize-y"
        style={{
          background: "#F6F7FB",
          border: "1.5px solid rgba(20,20,28,.1)",
          borderRadius: 14,
          padding: "10px 12px",
          fontSize: 14,
          color: "#14141C",
        }}
      />
    </div>
  );
}
