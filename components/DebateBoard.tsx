import type {
  DebateConfig,
  FinalSummary,
  Moderation,
  Turn,
  Verdict,
} from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  ongoing: "In progress",
  converged: "Converged — they reached agreement",
  impasse: "Impasse — irreducible disagreement",
  timeout: "Stopped — partial agreement, rounds exhausted",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  ongoing: "bg-slate-600",
  converged: "bg-emerald-600",
  impasse: "bg-rose-600",
  timeout: "bg-amber-600",
};

export function AgreementMeter({ score }: { score: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Common ground</span>
        <span className="tabular-nums">{score}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-claude to-gpt transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function TurnCard({ turn }: { turn: Turn }) {
  const isA = turn.side === "A";
  return (
    <div
      className={`rounded-xl p-4 border ${
        isA
          ? "bg-claude-soft/5 border-claude/40"
          : "bg-gpt-soft/5 border-gpt/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isA ? "bg-claude/20 text-claude" : "bg-gpt/20 text-gpt"
          }`}
        >
          {isA ? "Side A · Claude" : "Side B · GPT"}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {turn.phase}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
        {turn.text}
      </p>
    </div>
  );
}

export default function DebateBoard({
  config,
  turns,
  moderations,
  summary,
  verdict,
  running,
  mock,
}: {
  config: DebateConfig;
  turns: Turn[];
  moderations: Moderation[];
  summary: FinalSummary | null;
  verdict: Verdict;
  running: boolean;
  mock: boolean;
}) {
  const latestScore =
    moderations.length > 0
      ? moderations[moderations.length - 1].agreementScore
      : 0;

  // Group turns by round.
  const rounds = new Map<number, Turn[]>();
  for (const t of turns) {
    if (!rounds.has(t.round)) rounds.set(t.round, []);
    rounds.get(t.round)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{config.topic}</h2>
          <span
            className={`text-xs font-medium text-white px-3 py-1 rounded-full ${VERDICT_COLOR[verdict]}`}
          >
            {VERDICT_LABEL[verdict]}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-claude/10 border border-claude/30 p-3">
            <div className="text-claude font-semibold text-xs mb-1">
              SIDE A · Claude
            </div>
            {config.stanceA}
          </div>
          <div className="rounded-lg bg-gpt/10 border border-gpt/30 p-3">
            <div className="text-gpt font-semibold text-xs mb-1">
              SIDE B · GPT
            </div>
            {config.stanceB}
          </div>
        </div>
        <AgreementMeter score={latestScore} />
        {mock && (
          <p className="text-xs text-amber-400">
            ⚠ Running in mock mode — add API keys to use the real models.
          </p>
        )}
      </div>

      {[...rounds.keys()]
        .sort((a, b) => a - b)
        .map((roundNum) => {
          const roundTurns = rounds.get(roundNum)!;
          const mod = moderations.find((m) => m.round === roundNum);
          return (
            <div key={roundNum} className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Round {roundNum + 1} · {roundTurns[0]?.phase}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {roundTurns.map((t, i) => (
                  <TurnCard key={i} turn={t} />
                ))}
              </div>
              {mod && (
                <details className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm">
                  <summary className="cursor-pointer text-slate-300">
                    Moderator · {mod.agreementScore}% common ground —{" "}
                    <span className="text-slate-400">{mod.note}</span>
                  </summary>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className="text-emerald-400 text-xs font-semibold mb-1">
                        Points of agreement
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {mod.agreements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-rose-400 text-xs font-semibold mb-1">
                        Still contested
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {mod.contested.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              )}
            </div>
          );
        })}

      {running && (
        <div className="text-center text-slate-400 text-sm py-4 animate-pulse">
          Debating…
        </div>
      )}

      {summary && (
        <div className="rounded-xl border border-slate-600 bg-gradient-to-b from-slate-900 to-slate-900/50 p-5 space-y-3">
          <h3 className="text-white font-semibold">Summary</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-claude text-xs font-semibold mb-1">
                Side A&apos;s reasoning
              </div>
              <p className="text-slate-300">{summary.sideAReasoning}</p>
            </div>
            <div>
              <div className="text-gpt text-xs font-semibold mb-1">
                Side B&apos;s counter
              </div>
              <p className="text-slate-300">{summary.sideBCounter}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-emerald-400 text-xs font-semibold mb-1">
                Where they agreed
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {summary.agreements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-rose-400 text-xs font-semibold mb-1">
                Where they didn&apos;t
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {summary.disagreements.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm text-slate-200 border-t border-slate-700 pt-3">
            <span className="text-slate-500">Takeaway: </span>
            {summary.takeaway}
          </p>
        </div>
      )}
    </div>
  );
}
