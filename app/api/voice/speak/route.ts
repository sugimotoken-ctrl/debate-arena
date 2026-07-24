import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Voice output needs an OpenAI API key." },
        { status: 400 },
      );
    }

    const { text, voice } = (await req.json()) as {
      text: string;
      voice?: string;
    };
    if (!text?.trim()) {
      return Response.json({ error: "No text to speak." }, { status: 400 });
    }

    const client = new OpenAI();
    const speech = await client.audio.speech.create({
      model: TTS_MODEL,
      voice: voice || TTS_VOICE,
      input: text.slice(0, 4000),
    });

    const buf = Buffer.from(await speech.arrayBuffer());
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[voice/speak] error", err);
    return Response.json(
      { error: err?.message || "Speech failed." },
      { status: 500 },
    );
  }
}
