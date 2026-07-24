import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDebate } from "@/lib/store";
import DebateBoard from "@/components/DebateBoard";

export const dynamic = "force-dynamic";

export default async function DebatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const debate = await loadDebate(id);
  if (!debate) notFound();

  return (
    <div className="mx-auto px-6 py-8 space-y-6" style={{ maxWidth: 1000 }}>
      <div className="flex items-center justify-between">
        <h1 className="font-display brand-text" style={{ fontSize: 28 }}>
          ⚖️ DEBATE ARENA
        </h1>
        <Link
          href="/"
          className="debate-fill font-display"
          style={{
            fontSize: 14,
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 12,
          }}
        >
          NEW DEBATE
        </Link>
      </div>
      <DebateBoard
        config={debate.config}
        turns={debate.turns}
        moderations={debate.moderations}
        summary={debate.summary}
        verdict={debate.verdict}
        running={false}
        mock={debate.mock}
      />
    </div>
  );
}
