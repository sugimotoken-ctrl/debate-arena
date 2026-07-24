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

export default function CouncilApp() {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [language, setLanguage] = useState<Lang>("auto");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["cfo", "cmo", "coo", "investor", "contrarian"]),
  );

  const [advices, setAdvices] = useState<Advice[]>([]);
  const [synthesis, setSynthesis] = useState<CouncilSynthesis | null>(null);
  const [phase, setPhase] = useState<"idle" | "advising" | "synth">("idle");
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = phase !== "idle";
  const sortedAdvices = [...advices].sort(
    (a, b) => ORDER.indexOf(a.adviserId) - ORDER.indexOf(b.adviserId),
  );

  function toggle(id: string) {
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
    setPhase("advising");

    const ids = [...selected];
    const collected: Advice[] = [];

    // Each adviser is its own request, so answers stream in as they finish.
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
      // synthesis is best-effort
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">🏛️ The Council</h1>
        <p className="text-slate-400 text-sm">
          Bring a decision to your advisory board — powered by{" "}
          <span className="text-gpt font-medium">ChatGPT (GPT-5.5 Pro)</span>.
          Speak or type your topic, hear each adviser, then the Chair
          synthesizes a recommendation.
        </p>
      </header>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        {/* Language */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Language:</span>
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                language === l.id
                  ? "bg-gpt/20 border-gpt text-gpt"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {l.label}
            </button>
          ))}
          <span className="text-xs text-slate-600 ml-1">
            (voice input & adviser replies)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">Try:</span>
          {EXAMPLES.map((e, i) => (
            <button
              key={i}
              onClick={() => setTopic(e)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {e}
            </button>
          ))}
        </div>

        {/* Topic with mic */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Topic / decision
          </label>
          <div className="flex gap-2">
            <input
              value={topic}
              dir="auto"
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Type, or tap the mic to speak…"
              className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
            <MicButton
              language={language}
              title="Speak your topic"
              onText={(t) => setTopic((prev) => (prev ? prev + " " + t : t))}
            />
          </div>
        </div>

        {/* Context with mic */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Context <span className="text-slate-500">(optional)</span>
          </label>
          <div className="flex gap-2">
            <textarea
              value={context}
              dir="auto"
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="Background for the advisers — stage, market, constraints…"
              className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
            <MicButton
              language={language}
              title="Speak context"
              onText={(t) => setContext((prev) => (prev ? prev + " " + t : t))}
            />
          </div>
        </div>

        {/* Seats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-slate-300">
              Who&apos;s in the room?{" "}
              <span className="text-slate-500">({selected.size} selected)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(ADVISERS.map((a) => a.id)))}
                className="text-xs text-slate-400 hover:text-white"
              >
                All
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-slate-400 hover:text-white"
              >
                None
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {ADVISERS.map((a) => {
              const on = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={`flex items-start gap-3 text-left rounded-lg border p-3 transition ${
                    on
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-800/40 hover:border-slate-600"
                  }`}
                >
                  <span className="text-xl leading-none">{a.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm text-white">
                      {a.name}{" "}
                      <span className="text-slate-500 text-xs">· {a.role}</span>
                    </span>
                    <span className="block text-xs text-slate-400">{a.lens}</span>
                  </span>
                  <span
                    className={`ml-auto text-xs ${on ? "text-emerald-400" : "text-slate-600"}`}
                  >
                    {on ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={convene}
            disabled={running}
            className="px-5 py-2 rounded-lg bg-white text-slate-900 font-semibold text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            {phase === "advising"
              ? "Advisers deliberating…"
              : phase === "synth"
                ? "Chair synthesizing…"
                : "Convene meeting"}
          </button>
          {error && <span className="text-rose-400 text-sm">{error}</span>}
        </div>
      </div>

      {mock && advices.length > 0 && (
        <p className="text-xs text-amber-400 text-center">
          ⚠ Running in mock mode — add an OpenAI API key to hear the real advisers.
        </p>
      )}

      {(advices.length > 0 || phase === "advising") && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Around the table</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {sortedAdvices.map((a) => (
              <div
                key={a.adviserId}
                className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-sm font-semibold text-white">
                    {a.name}
                  </span>
                  <span className="text-xs text-slate-500">· {a.role}</span>
                  <span className="ml-auto">
                    <PlayButton
                      text={`${a.body}. ${a.bottomLine}`}
                    />
                  </span>
                </div>
                <p
                  dir="auto"
                  className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap"
                >
                  {a.body}
                </p>
                {a.bottomLine && (
                  <p
                    dir="auto"
                    className="mt-3 text-sm text-emerald-300 border-t border-slate-800 pt-2"
                  >
                    <span className="text-slate-500">Bottom line: </span>
                    {a.bottomLine}
                  </p>
                )}
              </div>
            ))}
            {phase === "advising" &&
              [...selected].length > advices.length && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500 animate-pulse grid place-items-center">
                  {[...selected].length - advices.length} more adviser(s)
                  thinking…
                </div>
              )}
          </div>
        </div>
      )}

      {phase === "synth" && (
        <div className="text-center text-slate-400 text-sm py-2 animate-pulse">
          The Chair is synthesizing…
        </div>
      )}

      {synthesis && (
        <div className="rounded-xl border border-slate-600 bg-gradient-to-b from-slate-900 to-slate-900/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">🪑 Chair&apos;s synthesis</h3>
            <span className="ml-auto">
              <PlayButton
                text={`Recommendation: ${synthesis.recommendation}`}
              />
            </span>
          </div>
          <div className="rounded-lg bg-white/5 border border-slate-700 p-3">
            <div className="text-xs text-slate-500 mb-1">Recommendation</div>
            <p dir="auto" className="text-sm text-slate-100">
              {synthesis.recommendation}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Section
              title="Consensus"
              color="text-emerald-400"
              items={synthesis.consensus}
            />
            <Section
              title="Tensions"
              color="text-amber-400"
              items={synthesis.tensions}
            />
            <Section
              title="Key risks"
              color="text-rose-400"
              items={synthesis.risks}
            />
            <Section
              title="Next steps"
              color="text-sky-400"
              items={synthesis.nextSteps}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
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
      <div className={`text-xs font-semibold mb-1 ${color}`}>{title}</div>
      <ul dir="auto" className="list-disc list-inside text-slate-300 space-y-1">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
