import type { SupabaseClient } from "@supabase/supabase-js";
import { ADVISERS, adviserById } from "./advisers-data";
import { adviseOne, synthesize, type Lang } from "./advisers";

const ORDER = ADVISERS.map((a) => a.id);

export interface RoomMessage {
  author_type: string;
  author_name: string;
  kind: string;
  body: string;
  bottom_line: string;
  meta: any;
}

/** Turn the stored thread into a plain-text transcript for adviser context. */
export function buildHistory(messages: RoomMessage[]): string {
  return messages
    .map((m) => {
      if (m.kind === "advice")
        return `${m.author_name}: ${m.body} (Bottom line: ${m.bottom_line})`;
      if (m.kind === "synthesis")
        return `Chair synthesis — recommendation: ${m.body}`;
      if (m.kind === "question") return `${m.author_name} asks: ${m.body}`;
      return `${m.author_name}: ${m.body}`;
    })
    .join("\n\n")
    .slice(-8000);
}

/** Run the selected advisers, inserting each answer as it lands. */
export async function runAdvisers(
  admin: SupabaseClient,
  roomId: string,
  opts: {
    topic: string;
    context: string;
    adviserIds: string[];
    language: Lang;
    history: string;
  },
) {
  const chosen = opts.adviserIds
    .map((id) => adviserById(id))
    .filter(Boolean)
    .sort((a, b) => ORDER.indexOf(a!.id) - ORDER.indexOf(b!.id)) as NonNullable<
    ReturnType<typeof adviserById>
  >[];

  const collected: {
    name: string;
    role: string;
    body: string;
    bottomLine: string;
  }[] = [];

  await Promise.all(
    chosen.map(async (a) => {
      const advice = await adviseOne(
        a,
        opts.topic,
        opts.context,
        opts.language,
        opts.history,
      );
      collected.push({
        name: a.name,
        role: a.role,
        body: advice.body,
        bottomLine: advice.bottomLine,
      });
      await admin.from("messages").insert({
        room_id: roomId,
        author_type: "adviser",
        author_id: a.id,
        author_name: a.name,
        kind: "advice",
        body: advice.body,
        bottom_line: advice.bottomLine,
        meta: { emoji: a.emoji, role: a.role, color: a.color },
      });
    }),
  );

  return collected;
}

/** Run the Chair synthesis and insert it. */
export async function runSynthesis(
  admin: SupabaseClient,
  roomId: string,
  opts: {
    topic: string;
    context: string;
    advices: { name: string; role: string; body: string; bottomLine: string }[];
    language: Lang;
    history: string;
  },
) {
  const synthesis = await synthesize(
    opts.topic,
    opts.context,
    opts.advices.map((a) => ({
      adviserId: "",
      name: a.name,
      role: a.role,
      emoji: "",
      body: a.body,
      bottomLine: a.bottomLine,
      model: "",
    })),
    opts.language,
    opts.history,
  );

  await admin.from("messages").insert({
    room_id: roomId,
    author_type: "chair",
    author_id: "chair",
    author_name: "The Chair",
    kind: "synthesis",
    body: synthesis.recommendation,
    meta: {
      consensus: synthesis.consensus,
      tensions: synthesis.tensions,
      risks: synthesis.risks,
      nextSteps: synthesis.nextSteps,
    },
  });
}
