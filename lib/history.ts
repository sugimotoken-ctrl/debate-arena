import type { Debate } from "./types";

// Per-browser debate history stored in localStorage. Keeps the full debate
// (turns, moderator notes, summary) so past discussions can be reopened in
// full without depending on server-side persistence.

const KEY = "debate-arena:history:v1";
const MAX = 50;

export function getHistory(): Debate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Debate[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(debate: Debate): Debate[] {
  const next = [debate, ...getHistory().filter((d) => d.id !== debate.id)].slice(
    0,
    MAX,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage full / unavailable — history is best-effort.
  }
  return next;
}

export function removeFromHistory(id: string): Debate[] {
  const next = getHistory().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): Debate[] {
  localStorage.removeItem(KEY);
  return [];
}
