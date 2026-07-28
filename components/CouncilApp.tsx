"use client";

import { useState } from "react";
import { ADVISERS } from "@/lib/advisers-data";
import type { Advice, CouncilSynthesis } from "@/lib/advisers-data";
import { MicButton, PlayButton } from "./voice";

type Lang = "auto" | "en" | "fa";

const EXAMPLES = [
  "Should we launch a freemium tier for our SaaS product?",
  "Should we open a second physical location next year?",
  "Should we pivot from services to a productized offering?",
];

const LANGS: { id: Lang; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "fa", label: "فارسی" },
];

const ORDER = ADVISERS.map((a) => a.id);

export default function CouncilApp({
  onSwitchToDebate,
}: {
  onSwitchToDebate?: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [language, setLanguage] = useState<Lang>("auto");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["cfo", "cmo", "coo", "investor", "contrarian"]),
  );
  const [convened, setConvened] = useState(false);

  const [advices, setAdvices] = useState<Advice[]>([]);
  const [synthesis, setSynthesis] = useState<CouncilSynthesis | null>(null);
  const [phase, setPhase] = useState<"idle" | "advising" | "synth">("idle");
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = phase !== "idle";
  const sortedAdvices = [...advices].sort(
    (a, b) => ORDER.indexOf(a.adviserId) - ORDER.indexOf(b.adviserId),
  );
  const seated = ADVISERS.filter((a) => selected.has(a.id));
  const seatedArc = seated.slice(0, 6);

  function reset() {
    setConvened(false);
  }

  function toggle(id: string) {
    reset();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function convene() {
    if (!topic.trim()) {
      setError("Enter a topic or decision.");
      return;
    }
    if (selected.size === 0) {
      setError("Invite at least one adviser to the meeting.");
      return;
    }
    setError(null);
    setAdvices([]);
    setSynthesis(null);
    setConvened(true);
    setPhase("advising");

    const ids = [...selected];
    const collected: Advice[] = [];

    await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch("/api/council/advise-one", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ topic, context, adviserId: id, language }),
          });
          const j = await r.json();
          if (j.error) throw new Error(j.error);
          if (j.advice) {
            collected.push(j.advice);
            setMock(!!j.mock);
            setAdvices((prev) => [...prev, j.advice]);
          }
        } catch (e: any) {
          setError((prev) => prev || e?.message || "An adviser failed.");
        }
      }),
    );

    if (collected.length === 0) {
      setPhase("idle");
      return;
    }

    setPhase("synth");
    try {
      const synthRes = await fetch("/api/council/synthesis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, context, advices: collected, language }),
      });
      const synthData = await synthRes.json();
      setSynthesis(synthData.synthesis ?? null);
    } catch {
      /* best effort */
    } finally {
      setPhase("idle");
    }
  }

  const topicShown = topic.trim() || "your decision";

  return (
    <div
      className="mx-auto px-10 pb-20"
      style={{ maxWidth: 1000 }}
    >
      {/* Hero */}
      <div className="text-center">
        <h1
          className="font-display brand-text uppercase mx-auto"
          style={{
            fontSize: "clamp(48px,7.5vw,96px)",
            letterSpacing: 1,
            lineHeight: 0.92,
          }}
        >
          🏛️ The Council
        </h1>
        <p
          className="mx-auto mt-4"
          style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.55, color: "#5C5C6E" }}
        >
          Bring a decision to your advisory board — powered by{" "}
          <b style={{ color: "#12B981" }}>ChatGPT (GPT-5.5)</b>. Speak or type
          your topic, hear each adviser, then the Chair synthesizes a
          recommendation.
        </p>
      </div>

      {/* Seated arc */}
      <div
        className="relative mx-auto mt-6"
        style={{ height: 190, maxWidth: 720 }}
      >
        {seatedArc.map((a, i) => {
          const n = seatedArc.length;
          const t = n > 1 ? i / (n - 1) : 0.5;
          const angle = Math.PI * (0.85 - 0.7 * t);
          const left = 50 + 42 * Math.cos(angle);
          const top = 150 - 80 * Math.sin(angle);
          return (
            <div
              key={a.id}
              className="absolute text-center"
              style={{
                left: `${left}%`,
                top: `${top}px`,
                transform: "translate(-50%,-50%)",
                width: 100,
                animation: "floaty 5s ease-in-out infinite",
                animationDelay: `${i * 0.35}s`,
              }}
            >
              <div
                className="mx-auto grid place-items-center"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 18,
                  border: "3px solid #fff",
                  background: a.tint,
                  fontSize: 28,
                  boxShadow: `0 10px 22px ${a.color}55`,
                }}
              >
                {a.emoji}
              </div>
              <div
                style={{ fontSize: 13, fontWeight: 700, color: "#3A3A48", marginTop: 6 }}
              >
                {a.name.replace(/^The /, "")}
              </div>
            </div>
          );
        })}
        {/* Chair orb */}
        <div
          className="absolute grid place-items-center"
          style={{ left: "50%", top: 150, transform: "translate(-50%,-50%)", width: 82, height: 82 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg,#FF6B4A,#FF9F1C,#12B981,#2E7BFF,#6C5CFF,#FF6B4A)",
              animation: "spin360 9s linear infinite",
            }}
          />
          <div
            className="absolute grid place-items-center rounded-full"
            style={{ inset: 4, background: "#fff", fontSize: 32 }}
          >
            🪑
          </div>
        </div>
      </div>

      {/* Console card */}
      <div
        className="relative bg-white overflow-hidden"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 28,
          padding: 32,
          boxShadow: "0 30px 70px rgba(20,20,28,.10)",
        }}
      >
        <div
          className="brand-fill absolute left-0 right-0 top-0"
          style={{ height: 6 }}
        />

        {/* Step 1 */}
        <StepHeader n="1" color="#12B981" label="SPEAK OR TYPE" />

        {/* Language */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span style={{ fontWeight: 700, fontSize: 14, color: "#6B6B7B" }}>
            Language:
          </span>
          {LANGS.map((l) => {
            const on = language === l.id;
            return (
              <button
                key={l.id}
                onClick={() => {
                  reset();
                  setLanguage(l.id);
                }}
                className="rounded-full transition"
                style={{
                  padding: "6px 14px",
                  fontWeight: 700,
                  fontSize: 13.5,
                  background: on ? "#E9FBF4" : "#F6F7FB",
                  border: on
                    ? "1.5px solid #12B981"
                    : "1.5px solid rgba(20,20,28,.1)",
                  color: on ? "#0E9E6E" : "#6B6B7B",
                }}
              >
                {l.label}
              </button>
            );
          })}
          <span style={{ fontSize: 13.5, color: "#9A9AAC" }}>
            (voice input &amp; adviser replies)
          </span>
        </div>

        {/* Topic */}
        <FieldLabel>Topic / decision</FieldLabel>
        <div className="flex gap-3 items-start">
          <input
            value={topic}
            dir="auto"
            onChange={(e) => {
              reset();
              setTopic(e.target.value);
            }}
            placeholder="Type, or tap the mic to speak…"
            className="flex-1 outline-none"
            style={fieldStyle(!!topic.trim())}
          />
          <MicButton
            language={language}
            title="Speak your topic"
            onText={(txt) => {
              reset();
              setTopic((p) => (p ? p + " " + txt : txt));
            }}
          />
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((e, i) => (
            <button
              key={i}
              onClick={() => {
                reset();
                setTopic(e);
              }}
              className="rounded-full"
              style={{
                padding: "5px 12px",
                fontSize: 12.5,
                background: "#F6F7FB",
                border: "1px solid rgba(20,20,28,.08)",
                color: "#6B6B7B",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Context */}
        <FieldLabel>
          Context <span style={{ color: "#9A9AAC" }}>(optional)</span>
        </FieldLabel>
        <div className="flex gap-3 items-start">
          <textarea
            value={context}
            dir="auto"
            onChange={(e) => {
              reset();
              setContext(e.target.value);
            }}
            placeholder="Background for the advisers — stage, market, constraints…"
            className="flex-1 outline-none resize-y"
            style={{ ...fieldStyle(!!context.trim()), minHeight: 84 }}
          />
          <MicButton
            language={language}
            title="Speak context"
            onText={(txt) => {
              reset();
              setContext((p) => (p ? p + " " + txt : txt));
            }}
          />
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3 mt-7 flex-wrap">
          <StepHeader n="2" color="#6C5CFF" label="WHO'S IN THE ROOM?" inline />
          <span
            className="rounded-full"
            style={{
              background: "#E9FBF4",
              color: "#0E9E6E",
              fontWeight: 700,
              fontSize: 13,
              padding: "5px 12px",
            }}
          >
            {selected.size} seated
          </span>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => {
                reset();
                setSelected(new Set(ADVISERS.map((a) => a.id)));
              }}
              style={{ color: "#6C5CFF", fontWeight: 700, fontSize: 14 }}
            >
              All
            </button>
            <button
              onClick={() => {
                reset();
                setSelected(new Set());
              }}
              style={{ color: "#9A9AAC", fontWeight: 700, fontSize: 14 }}
            >
              None
            </button>
          </div>
        </div>

        {/* Adviser grid */}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {ADVISERS.map((a) => {
            const on = selected.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className="flex items-center gap-3 text-left transition hover:-translate-y-[3px]"
                style={{
                  borderRadius: 16,
                  padding: 15,
                  background: on ? a.tint : "#fff",
                  border: on
                    ? `2px solid ${a.color}`
                    : "2px solid rgba(20,20,28,.1)",
                  boxShadow: on
                    ? `0 10px 26px ${a.color}33`
                    : "0 2px 8px rgba(20,20,28,.04)",
                }}
              >
                <span
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: a.tint,
                    fontSize: 23,
                    boxShadow: `0 6px 14px ${a.color}40`,
                  }}
                >
                  {a.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 15 }}>
                    <b style={{ color: "#14141C" }}>{a.name}</b>{" "}
                    <span style={{ color: "#8A8A9A", fontWeight: 500 }}>
                      · {a.role}
                    </span>
                  </span>
                  <span
                    className="block truncate"
                    style={{ fontSize: 13, color: "#8A8A9A" }}
                  >
                    {a.lens}
                  </span>
                </span>
                <span
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: on ? a.color : "#fff",
                    border: on ? "none" : "2px solid rgba(20,20,28,.2)",
                    color: on ? "#fff" : "#B8B8C6",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {on ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Convene */}
        <button
          onClick={convene}
          disabled={running}
          className="brand-fill font-display w-full mt-6 disabled:opacity-60"
          style={{
            fontSize: 20,
            letterSpacing: 1.5,
            color: "#fff",
            padding: "16px 30px",
            borderRadius: 16,
            boxShadow: "0 14px 34px rgba(108,92,255,.28)",
          }}
        >
          {phase === "advising"
            ? "ADVISERS DELIBERATING…"
            : phase === "synth"
              ? "CHAIR SYNTHESIZING…"
              : "🏛️ CONVENE MEETING"}
        </button>

        {error && (
          <p style={{ color: "#FF6B4A", fontSize: 14, marginTop: 10 }}>{error}</p>
        )}
        {convened && !error && (
          <div
            className="anim-pop"
            style={{ marginTop: 16, color: "#6C5CFF", fontWeight: 600, fontSize: 15 }}
          >
            Convening {selected.size} advisers on “{topicShown}” — the Chair will
            synthesize their recommendation.
          </div>
        )}
      </div>

      <p className="text-center mt-6" style={{ fontSize: 13, color: "#9A9AAC" }}>
        Each adviser weighs in from their lens · the Chair synthesizes a final
        recommendation
      </p>

      {mock && advices.length > 0 && (
        <p className="text-center mt-4" style={{ fontSize: 13, color: "#C06A2B" }}>
          ⚠ Running in mock mode — add an OpenAI API key to hear the real advisers.
        </p>
      )}

      {/* Results */}
      {(advices.length > 0 || phase === "advising") && (
        <div className="mt-8">
          <h2 className="font-display" style={{ fontSize: 24, letterSpacing: 0.5 }}>
            AROUND THE TABLE
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {sortedAdvices.map((a) => {
              const adv = ADVISERS.find((x) => x.id === a.adviserId);
              const color = adv?.color || "#6C5CFF";
              const tint = adv?.tint || "#F1EFFF";
              return (
                <div
                  key={a.adviserId}
                  className="bg-white"
                  style={{
                    border: `1px solid ${color}44`,
                    borderRadius: 20,
                    padding: 18,
                    boxShadow: `0 12px 30px ${color}1a`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="grid place-items-center"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: tint,
                        fontSize: 18,
                      }}
                    >
                      {a.emoji}
                    </span>
                    <span style={{ fontWeight: 700, color: "#14141C" }}>
                      {a.name}
                    </span>
                    <span style={{ fontSize: 12, color: "#8A8A9A" }}>· {a.role}</span>
                    <span className="ml-auto">
                      <PlayButton text={`${a.body}. ${a.bottomLine}`} />
                    </span>
                  </div>
                  <p
                    dir="auto"
                    style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3A48", whiteSpace: "pre-wrap" }}
                  >
                    {a.body}
                  </p>
                  {a.bottomLine && (
                    <p
                      dir="auto"
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px solid rgba(20,20,28,.08)",
                        fontSize: 14,
                        color,
                        fontWeight: 600,
                      }}
                    >
                      Bottom line: {a.bottomLine}
                    </p>
                  )}
                </div>
              );
            })}
            {phase === "advising" && [...selected].length > advices.length && (
              <div
                className="grid place-items-center animate-pulse"
                style={{
                  border: "1px dashed rgba(20,20,28,.15)",
                  borderRadius: 20,
                  padding: 18,
                  color: "#9A9AAC",
                  fontSize: 14,
                }}
              >
                {[...selected].length - advices.length} more adviser(s) thinking…
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "synth" && (
        <p className="text-center mt-4 animate-pulse" style={{ color: "#6C5CFF" }}>
          The Chair is synthesizing…
        </p>
      )}

      {synthesis && (
        <div
          className="bg-white mt-6"
          style={{
            border: "1px solid rgba(20,20,28,.08)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 24px 60px rgba(20,20,28,.10)",
          }}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-display" style={{ fontSize: 22 }}>
              🪑 CHAIR&apos;S SYNTHESIS
            </h3>
            <span className="ml-auto">
              <PlayButton text={`Recommendation: ${synthesis.recommendation}`} />
            </span>
          </div>
          <div
            className="mt-3"
            style={{ background: "#F6F7FB", borderRadius: 14, padding: 14 }}
          >
            <div style={{ fontSize: 12, color: "#8A8A9A", marginBottom: 4 }}>
              Recommendation
            </div>
            <p dir="auto" style={{ fontSize: 15, color: "#14141C" }}>
              {synthesis.recommendation}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <SynthList title="Consensus" color="#0E9E6E" items={synthesis.consensus} />
            <SynthList title="Tensions" color="#FF9F1C" items={synthesis.tensions} />
            <SynthList title="Key risks" color="#FF4D9D" items={synthesis.risks} />
            <SynthList title="Next steps" color="#2E7BFF" items={synthesis.nextSteps} />
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeader({
  n,
  color,
  label,
  inline,
}: {
  n: string;
  color: string;
  label: string;
  inline?: boolean;
}) {
  return (
    <div className="flex items-center gap-3" style={inline ? {} : { marginTop: 0 }}>
      <span
        className="grid place-items-center"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: color,
          color: "#fff",
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {n}
      </span>
      <span
        className="font-display"
        style={{ fontSize: 18, letterSpacing: 1.2 }}
      >
        {label}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block"
      style={{ fontWeight: 700, fontSize: 15, color: "#3A3A48", margin: "16px 0 6px" }}
    >
      {children}
    </label>
  );
}

function fieldStyle(active: boolean): React.CSSProperties {
  return {
    background: "#F6F7FB",
    border: active ? "1.5px solid #6C5CFF" : "1.5px solid rgba(20,20,28,.1)",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 16,
    color: "#14141C",
  };
}

function SynthList({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
        {title}
      </div>
      <ul
        dir="auto"
        className="list-disc list-inside space-y-1"
        style={{ fontSize: 14, color: "#3A3A48" }}
      >
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
