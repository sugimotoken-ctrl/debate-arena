import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Debate } from "./types";

// Persistence with graceful fallback:
//  - If Vercel KV env vars are present, debates are saved to KV (shareable,
//    durable across serverless invocations and deploys).
//  - Otherwise we fall back to a local filesystem store (a temp dir) so the app
//    and shareable links still work in local dev without any setup. On Vercel's
//    serverless filesystem this fallback is ephemeral — use KV in production.

const hasKv = () =>
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const KEY = (id: string) => `debate:${id}`;
const DIR = path.join(os.tmpdir(), "debate-arena");
const FILE = (id: string) => path.join(DIR, `${id}.json`);

export async function saveDebate(debate: Debate): Promise<void> {
  if (hasKv()) {
    const { kv } = await import("@vercel/kv");
    await kv.set(KEY(debate.id), debate, { ex: 60 * 60 * 24 * 90 });
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE(debate.id), JSON.stringify(debate), "utf8");
}

export async function loadDebate(id: string): Promise<Debate | null> {
  if (hasKv()) {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<Debate>(KEY(id))) ?? null;
  }
  try {
    const raw = await fs.readFile(FILE(id), "utf8");
    return JSON.parse(raw) as Debate;
  } catch {
    return null;
  }
}

export const persistenceMode = () => (hasKv() ? "kv" : "filesystem");
