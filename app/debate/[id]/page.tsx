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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">⚖️ Debate Arena</h1>
        <Link
          href="/"
          className="text-sm px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-200"
        >
          New debate
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
