# ⚖️ Debate Arena

Two AI models debate opposing sides of a topic, a **neutral third model** scores
how much common ground they have after each round, decides when to stop
(converged / impasse / timeout), and writes a short summary of the outcome.

- **Side A** — Claude Opus 4.8 (`claude-opus-4-8`)
- **Side B** — GPT-5.5 Thinking (OpenAI)
- **Moderator** — Google Gemini (neutral; scores agreement + writes the verdict)

## Features

- Structured rounds: **opening → rebuttal → closing**, configurable max rounds.
- **Agreement meter** that climbs each round.
- **Auto-stop** when agreement crosses your threshold (converged), the gap looks
  irreducible (impasse), or rounds run out (timeout).
- **End-of-debate summary**: each side's reasoning, the counter, what they
  agreed/disagreed on, and a neutral takeaway.
- **Swap & rematch** to expose model bias.
- **Saved debates + shareable links** (Vercel KV).
- **Mock mode**: runs with zero keys so you can see the whole flow, then add
  keys one at a time.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in keys (optional — mock mode works without)
npm run dev
```

Open http://localhost:3000. With no keys set, it runs in mock mode end-to-end.

## Model ids

- `ANTHROPIC_MODEL` defaults to `claude-opus-4-8`.
- `OPENAI_MODEL` defaults to `gpt-5.5-thinking` — **confirm the exact id for your
  account** and override if needed.
- `GOOGLE_MODEL` defaults to `gemini-2.5-pro`.

## Deploy

Push to GitHub, import into Vercel, add the env vars, and (for shareable links)
add a Vercel KV store — `KV_REST_API_URL` / `KV_REST_API_TOKEN` are injected
automatically.
