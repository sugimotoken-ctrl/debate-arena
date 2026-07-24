import OpenAI from "openai";
import { hasGpt } from "./debaters";
import { ADVISERS, adviserById } from "./advisers-data";
import type { Adviser, Advice, CouncilSynthesis } from "./advisers-data";

// Re-export data + types so server code can import everything from here.
export { ADVISERS, adviserById };
export type { Adviser, Advice, CouncilSynthesis };

// The Council runs on ChatGPT only, at the highest tier available.
export const COUNCIL_MODEL = process.env.COUNCIL_MODEL || "gpt-5.5-pro";
export const COUNCIL_EFFORT = process.env.COUNCIL_EFFORT || "high";

export type Lang = "auto" | "en" | "fa";

function langInstruction(language: Lang): string {
  if (language === "fa")
    return "Respond entirely in Farsi (فارسی). Every field of your answer must be in natural Farsi.";
  if (language === "en") return "Respond in English.";
  return "Respond in the same language the user used in the topic and context.";
}

function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(body.slice(start, end + 1));
}

// gpt-5.5-pro runs in thinking mode. Try with reasoning effort; if a model
// rejects the param, retry without it.
async function respond(
  client: OpenAI,
  opts: { instructions: string; input: string; max: number },
): Promise<string> {
  const base = {
    model: COUNCIL_MODEL,
    instructions: opts.instructions,
    input: opts.input,
    max_output_tokens: opts.max,
  };
  try {
    const res = await client.responses.create({
      ...base,
      reasoning: { effort: COUNCIL_EFFORT as any },
    });
    return res.output_text || "";
  } catch (e: any) {
    const m = String(e?.message || "");
    if (/reasoning|effort|unsupported|unknown|not supported/i.test(m)) {
      const res = await client.responses.create(base);
      return res.output_text || "";
    }
    throw e;
  }
}

// ---------- Advice generation (one adviser) ----------

export async function adviseOne(
  adviser: Adviser,
  topic: string,
  context: string,
  language: Lang = "auto",
): Promise<Advice> {
  if (!hasGpt()) return mockAdvice(adviser, topic);

  const instructions = [
    adviser.persona,
    "You are one of several advisers in a boardroom advising on a decision.",
    `Speak ONLY from your perspective as ${adviser.name} (${adviser.role}).`,
    "Be concise and specific — at most ~140 words for the body. No preamble.",
    langInstruction(language),
    'Respond ONLY with JSON: {"body": string, "bottomLine": string}. "bottomLine" is your single-sentence crisp recommendation.',
  ].join("\n");

  const input = [
    `TOPIC / DECISION: ${topic}`,
    context ? `CONTEXT: ${context}` : "",
    "",
    "Give your advice.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new OpenAI();
    const text = await respond(client, { instructions, input, max: 6000 });
    const j = extractJson(text);
    return {
      adviserId: adviser.id,
      name: adviser.name,
      role: adviser.role,
      emoji: adviser.emoji,
      body: String(j.body ?? "").trim(),
      bottomLine: String(j.bottomLine ?? "").trim(),
      model: COUNCIL_MODEL,
    };
  } catch (e: any) {
    return {
      adviserId: adviser.id,
      name: adviser.name,
      role: adviser.role,
      emoji: adviser.emoji,
      body: `⚠ ${adviser.name} couldn't respond this time (${String(e?.message || "error").slice(0, 120)}).`,
      bottomLine: "",
      model: COUNCIL_MODEL,
    };
  }
}

// ---------- Chair synthesis ----------

export async function synthesize(
  topic: string,
  context: string,
  advices: Advice[],
  language: Lang = "auto",
): Promise<CouncilSynthesis> {
  if (!hasGpt()) return mockSynthesis(advices);

  const panel = advices
    .map((a) => `${a.name} (${a.role}): ${a.body}\nBottom line: ${a.bottomLine}`)
    .join("\n\n");

  const instructions = [
    "You are the neutral Chair of an advisory board. You do not add new opinions;",
    "you synthesize the advisers' input into a decision-ready brief.",
    langInstruction(language),
    "Respond ONLY with JSON of this shape:",
    "{",
    '  "consensus": string[],',
    '  "tensions": string[],',
    '  "recommendation": string,',
    '  "risks": string[],',
    '  "nextSteps": string[]',
    "}",
  ].join("\n");

  const input = [
    `TOPIC / DECISION: ${topic}`,
    context ? `CONTEXT: ${context}` : "",
    "",
    "ADVISER INPUT:",
    panel,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new OpenAI();
    const text = await respond(client, { instructions, input, max: 8000 });
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
    body: `(mock) From a ${adviser.role} perspective on "${topic}": ${adviser.lens.toLowerCase()} are what matter most here. Add an OpenAI API key to hear the real ${adviser.name}.`,
    bottomLine: `Proceed carefully, watching ${adviser.lens.split(",")[0].toLowerCase()}.`,
    model: `${COUNCIL_MODEL} (mock)`,
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
