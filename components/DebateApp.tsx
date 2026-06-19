"use client";

import { useState } from "react";
import DebateBoard from "./DebateBoard";
import type {
  DebateConfig,
  FinalSummary,
  Moderation,
  Turn,
  Verdict,
} from "@/lib/types";

const EXAMPLES = [
  {
    topic: "Should AI development be paused?",
    stanceA: "AI development should be paused until safety is solved.",
    stanceB: "AI development should continue without a pause.",
  },
  {
    topic: "Remote work vs office work",
    stanceA: "Companies are more productive fully remote.",
    stanceB: "Companies are more productive working from an office.",
  },
  {
    topic: "Is a four-day work week better?",
    stanceA: "A four-day work week improves outcomes for everyone.",
    stanceB: "A five-day work week remains the better default.",
  },
];

export default function DebateApp() {
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
      setError("Please fill in a topic and both stances.");
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

      // Final summary
      const sumRes = await fetch("/api/debate/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config, turns: acc, verdict: finalVerdict }),
      });
      const sumData = await sumRes.json();
      const finalSummary: FinalSummary | null = sumData.summary ?? null;
      setSummary(finalSummary);

      // Auto-save for a shareable link
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">⚖️ Debate Arena</h1>
        <p className="text-slate-400 text-sm">
          <span className="text-claude font-medium">Claude Opus 4.8</span> vs{" "}
          <span className="text-gpt font-medium">GPT-5.5 Thinking</span> — a
          neutral moderator scores agreement and writes the verdict.
        </p>
      </header>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">Try:</span>
          {EXAMPLES.map((e, i) => (
            <button
              key={i}
              onClick={() => loadExample(i)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {e.topic}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Should social media have age limits?"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-claude mb-1">
              Side A — Claude defends
            </label>
            <textarea
              value={stanceA}
              onChange={(e) => setStanceA(e.target.value)}
              rows={2}
              placeholder="The position Claude argues for"
              className="w-full rounded-lg bg-slate-800 border border-claude/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-claude"
            />
          </div>
          <div>
            <label className="block text-sm text-gpt mb-1">
              Side B — GPT defends
            </label>
            <textarea
              value={stanceB}
              onChange={(e) => setStanceB(e.target.value)}
              rows={2}
              placeholder="The opposing position GPT argues for"
              className="w-full rounded-lg bg-slate-800 border border-gpt/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gpt"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Max rounds: {maxRounds}
            </label>
            <input
              type="range"
              min={2}
              max={8}
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Agreement threshold: {threshold}%
            </label>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={run}
              disabled={running}
              className="px-5 py-2 rounded-lg bg-white text-slate-900 font-semibold text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              {running ? "Debating…" : "Start debate"}
            </button>
            {started && !running && (
              <button
                onClick={swapAndRerun}
                title="Swap sides and run again to test model bias"
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
              >
                ⇄ Swap & rematch
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}
        {shareId && (
          <p className="text-sm text-emerald-400">
            Saved ·{" "}
            <a className="underline" href={`/debate/${shareId}`}>
              shareable link
            </a>
          </p>
        )}
      </div>

      {started && (
        <DebateBoard
          config={config}
          turns={turns}
          moderations={moderations}
          summary={summary}
          verdict={verdict}
          running={running}
          mock={mock}
        />
      )}
    </div>
  );
}
