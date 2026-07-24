import type {
  DebateConfig,
  FinalSummary,
  Moderation,
  Turn,
  Verdict,
} from "@/lib/types";

const A_COLOR = "#FF6B4A";
const A_TINT = "#FFF1EC";
const B_COLOR = "#6C5CFF";
const B_TINT = "#F1EFFF";

const VERDICT_LABEL: Record<Verdict, string> = {
  ongoing: "In progress",
  converged: "Converged — they reached agreement",
  impasse: "Impasse — irreducible disagreement",
  timeout: "Stopped — partial agreement, rounds exhausted",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  ongoing: "#8A8A9A",
  converged: "#12B981",
  impasse: "#FF4D9D",
  timeout: "#FF9F1C",
};

export function AgreementMeter({ score }: { score: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1" style={{ fontSize: 12, color: "#8A8A9A" }}>
        <span>Common ground</span>
        <span className="tabular-nums">{score}%</span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ background: "#EDEEF4" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: "linear-gradient(90deg,#FF6B4A,#6C5CFF)",
          }}
        />
      </div>
    </div>
  );
}

function TurnCard({ turn }: { turn: Turn }) {
  const isA = turn.side === "A";
  const color = isA ? A_COLOR : B_COLOR;
  const tint = isA ? A_TINT : B_TINT;
  return (
    <div
      className="bg-white"
      style={{
        border: `1px solid ${color}44`,
        borderRadius: 16,
        padding: 16,
        boxShadow: `0 8px 22px ${color}14`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="rounded-full"
          style={{
            background: tint,
            color,
            fontWeight: 700,
            fontSize: 12,
            padding: "3px 10px",
          }}
        >
          {isA ? "Side A · Claude" : "Side B · GPT"}
        </span>
        <span
          className="uppercase"
          style={{ fontSize: 10, letterSpacing: 1, color: "#9A9AAC" }}
        >
          {turn.phase}
        </span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3A48", whiteSpace: "pre-wrap" }}>
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

  const rounds = new Map<number, Turn[]>();
  for (const t of turns) {
    if (!rounds.has(t.round)) rounds.set(t.round, []);
    rounds.get(t.round)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div
        className="bg-white space-y-3"
        style={{
          border: "1px solid rgba(20,20,28,.08)",
          borderRadius: 20,
          padding: 18,
          boxShadow: "0 12px 30px rgba(20,20,28,.06)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#14141C" }}>
            {config.topic}
          </h2>
          <span
            className="rounded-full"
            style={{
              background: VERDICT_COLOR[verdict],
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
            }}
          >
            {VERDICT_LABEL[verdict]}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3" style={{ fontSize: 14 }}>
          <div style={{ background: A_TINT, borderRadius: 12, padding: 12, color: "#3A3A48" }}>
            <div style={{ color: A_COLOR, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
              SIDE A · Claude
            </div>
            {config.stanceA}
          </div>
          <div style={{ background: B_TINT, borderRadius: 12, padding: 12, color: "#3A3A48" }}>
            <div style={{ color: B_COLOR, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
              SIDE B · GPT
            </div>
            {config.stanceB}
          </div>
        </div>
        <AgreementMeter score={latestScore} />
        {mock && (
          <p style={{ fontSize: 12, color: "#C06A2B" }}>
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
              <div className="uppercase" style={{ fontSize: 11, letterSpacing: 2, color: "#9A9AAC" }}>
                Round {roundNum + 1} · {roundTurns[0]?.phase}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {roundTurns.map((t, i) => (
                  <TurnCard key={i} turn={t} />
                ))}
              </div>
              {mod && (
                <details
                  className="bg-white"
                  style={{
                    border: "1px solid rgba(20,20,28,.08)",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                  }}
                >
                  <summary style={{ cursor: "pointer", color: "#3A3A48" }}>
                    Moderator · {mod.agreementScore}% common ground —{" "}
                    <span style={{ color: "#8A8A9A" }}>{mod.note}</span>
                  </summary>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <div style={{ color: "#0E9E6E", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        Points of agreement
                      </div>
                      <ul className="list-disc list-inside space-y-1" style={{ color: "#3A3A48" }}>
                        {mod.agreements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ color: "#FF4D9D", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        Still contested
                      </div>
                      <ul className="list-disc list-inside space-y-1" style={{ color: "#3A3A48" }}>
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
        <div className="text-center py-4 animate-pulse" style={{ color: "#8A8A9A", fontSize: 14 }}>
          Debating…
        </div>
      )}

      {summary && (
        <div
          className="bg-white space-y-3"
          style={{
            border: "1px solid rgba(20,20,28,.08)",
            borderRadius: 20,
            padding: 20,
            boxShadow: "0 24px 60px rgba(20,20,28,.10)",
          }}
        >
          <h3 style={{ fontWeight: 700, color: "#14141C" }}>Summary</h3>
          <div className="grid sm:grid-cols-2 gap-4" style={{ fontSize: 14 }}>
            <div>
              <div style={{ color: A_COLOR, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Side A&apos;s reasoning
              </div>
              <p style={{ color: "#3A3A48" }}>{summary.sideAReasoning}</p>
            </div>
            <div>
              <div style={{ color: B_COLOR, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Side B&apos;s counter
              </div>
              <p style={{ color: "#3A3A48" }}>{summary.sideBCounter}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4" style={{ fontSize: 14 }}>
            <div>
              <div style={{ color: "#0E9E6E", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Where they agreed
              </div>
              <ul className="list-disc list-inside space-y-1" style={{ color: "#3A3A48" }}>
                {summary.agreements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ color: "#FF4D9D", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Where they didn&apos;t
              </div>
              <ul className="list-disc list-inside space-y-1" style={{ color: "#3A3A48" }}>
                {summary.disagreements.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "#14141C", borderTop: "1px solid rgba(20,20,28,.08)", paddingTop: 12 }}>
            <span style={{ color: "#8A8A9A" }}>Takeaway: </span>
            {summary.takeaway}
          </p>
        </div>
      )}
    </div>
  );
}
