"use client";

import { useState } from "react";
import { ADVISERS } from "@/lib/advisers-data";
import type { Advice, CouncilSynthesis } from "@/lib/advisers-data";

const EXAMPLES = [
  "Should we launch a freemium tier for our SaaS product?",
  "Should we open a second physical location next year?",
  "Should we pivot from services to a productized offering?",
];

export default function CouncilApp() {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["cfo", "cmo", "coo", "investor", "contrarian"]),
  );

  const [advices, setAdvices] = useState<Advice[]>([]);
  const [synthesis, setSynthesis] = useState<CouncilSynthesis | null>(null);
  const [phase, setPhase] = useState<"idle" | "advising" | "synth">("idle");
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = phase !== "idle";

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

    try {
      const adviseRes = await fetch("/api/council/advise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          context,
          adviserIds: [...selected],
        }),
      });
      if (!adviseRes.ok) {
        const j = await adviseRes.json().catch(() => ({}));
        throw new Error(j.error || "The council could not convene.");
      }
      const data = (await adviseRes.json()) as {
        advices: Advice[];
        mock: boolean;
      };
      setAdvices(data.advices);
      setMock(data.mock);

      setPhase("synth");
      const synthRes = await fetch("/api/council/synthesis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, context, advices: data.advices }),
      });
      const synthData = await synthRes.json();
      setSynthesis(synthData.synthesis ?? null);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">🏛️ The Council</h1>
        <p className="text-slate-400 text-sm">
          Bring a decision to your advisory board. Choose who&apos;s in the room,
          hear each adviser, then the Chair synthesizes a recommendation.
        </p>
      </header>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
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

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Topic / decision
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Should we raise prices by 20%?"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Context <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            placeholder="Any background the advisers should know — stage, market, constraints…"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

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
          ⚠ Running in mock mode — add API keys to hear the real advisers.
        </p>
      )}

      {advices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Around the table</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {advices.map((a) => (
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
                </div>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {a.body}
                </p>
                {a.bottomLine && (
                  <p className="mt-3 text-sm text-emerald-300 border-t border-slate-800 pt-2">
                    <span className="text-slate-500">Bottom line: </span>
                    {a.bottomLine}
                  </p>
                )}
              </div>
            ))}
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
          <h3 className="text-white font-semibold">🪑 Chair&apos;s synthesis</h3>
          <div className="rounded-lg bg-white/5 border border-slate-700 p-3">
            <div className="text-xs text-slate-500 mb-1">Recommendation</div>
            <p className="text-sm text-slate-100">{synthesis.recommendation}</p>
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
      <ul className="list-disc list-inside text-slate-300 space-y-1">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
