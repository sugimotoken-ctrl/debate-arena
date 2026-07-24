import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, hasClaude } from "./debaters";
import { ADVISERS, adviserById } from "./advisers-data";
import type { Adviser, Advice, CouncilSynthesis } from "./advisers-data";

// Re-export data + types so server code can import everything from here.
export { ADVISERS, adviserById };
export type { Adviser, Advice, CouncilSynthesis };

// ---------- Advice generation ----------

function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(body.slice(start, end + 1));
}

function buildAdvicePrompt(adviser: Adviser, topic: string, context: string) {
  const system = [
    adviser.persona,
    `You are one of several advisers in a boardroom advising on a decision.`,
    `Speak ONLY from your perspective as ${adviser.name} (${adviser.role}).`,
    `Be concise and specific — at most ~140 words. No preamble.`,
    `End with one line starting exactly with "Bottom line:" giving your crisp recommendation.`,
  ].join("\n");

  const user = [
    `TOPIC / DECISION: ${topic}`,
    context ? `CONTEXT: ${context}` : "",
    ``,
    `Give your advice.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export async function adviseOne(
  adviser: Adviser,
  topic: string,
  context: string,
): Promise<Advice> {
  if (!hasClaude()) return mockAdvice(adviser, topic);

  const { system, user } = buildAdvicePrompt(adviser, topic, context);
  const client = new Anthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 900,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return splitAdvice(adviser, text, ANTHROPIC_MODEL);
}

function splitAdvice(adviser: Adviser, text: string, model: string): Advice {
  const m = text.match(/bottom line:\s*(.*)$/i);
  const bottomLine = m ? m[1].trim() : "";
  const body = m ? text.slice(0, m.index).trim() : text;
  return {
    adviserId: adviser.id,
    name: adviser.name,
    role: adviser.role,
    emoji: adviser.emoji,
    body,
    bottomLine,
    model,
  };
}

// ---------- Chair synthesis ----------

export async function synthesize(
  topic: string,
  context: string,
  advices: Advice[],
): Promise<CouncilSynthesis> {
  if (!hasClaude()) return mockSynthesis(advices);

  const panel = advices
    .map((a) => `${a.name} (${a.role}): ${a.body}\nBottom line: ${a.bottomLine}`)
    .join("\n\n");

  const system = [
    `You are the neutral Chair of an advisory board. You do not add new opinions;`,
    `you synthesize the advisers' input into a decision-ready brief.`,
    `Respond ONLY with JSON of this shape:`,
    `{`,
    `  "consensus": string[],   // points most advisers agree on`,
    `  "tensions": string[],    // genuine disagreements between advisers`,
    `  "recommendation": string,// 1-3 sentence balanced recommendation`,
    `  "risks": string[],       // the most important risks raised`,
    `  "nextSteps": string[]    // concrete next actions`,
    `}`,
  ].join("\n");

  const user = [
    `TOPIC / DECISION: ${topic}`,
    context ? `CONTEXT: ${context}` : "",
    ``,
    `ADVISER INPUT:`,
    panel,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const j = extractJson(text);
    return {
      consensus: arr(j.consensus),
      tensions: arr(j.tensions),
      recommendation: String(j.recommendation ?? ""),
      risks: arr(j.risks),
      nextSteps: arr(j.nextSteps),
    };
  } catch {
    return mockSynthesis(advices);
  }
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean).slice(0, 8);
}

// ---------- Mock fallbacks ----------

export function mockAdvice(adviser: Adviser, topic: string): Advice {
  return {
    adviserId: adviser.id,
    name: adviser.name,
    role: adviser.role,
    emoji: adviser.emoji,
    body: `(mock) From a ${adviser.role} perspective on "${topic}": ${adviser.lens.toLowerCase()} are what matter most here. Add API keys to hear the real ${adviser.name}.`,
    bottomLine: `Proceed carefully, watching ${adviser.lens.split(",")[0].toLowerCase()}.`,
    model: `${ANTHROPIC_MODEL} (mock)`,
  };
}

export function mockSynthesis(advices: Advice[]): CouncilSynthesis {
  return {
    consensus: ["The advisers broadly agree the decision is worth taking seriously."],
    tensions: ["Growth ambition vs. financial caution.", "Speed vs. risk control."],
    recommendation:
      "(mock) Proceed with a small, time-boxed test that de-risks the biggest unknowns before committing further.",
    risks: advices.slice(0, 3).map((a) => `${a.name}: ${a.bottomLine}`),
    nextSteps: [
      "Define success metrics for a pilot.",
      "Estimate cost and payback.",
      "Revisit with the council after the pilot.",
    ],
  };
}
