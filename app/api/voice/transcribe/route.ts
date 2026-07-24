import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const STT_MODEL = process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Voice input needs an OpenAI API key." },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const language = String(form.get("language") || "auto");

    if (!audio) {
      return NextResponse.json({ error: "No audio provided." }, { status: 400 });
    }

    const client = new OpenAI();
    const type = audio.type || "audio/webm";
    // Filename extension must match the actual audio format, or the API
    // rejects it as "corrupted". Prefer the uploaded name; else derive it.
    const extByType: Record<string, string> = {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "mp4",
      "audio/m4a": "m4a",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
    };
    const filename =
      audio.name && /\.[a-z0-9]+$/i.test(audio.name)
        ? audio.name
        : `audio.${extByType[type.split(";")[0]] || "webm"}`;
    const file = await toFile(Buffer.from(await audio.arrayBuffer()), filename, {
      type,
    });

    const res = await client.audio.transcriptions.create({
      model: STT_MODEL,
      file,
      // gpt-4o-transcribe accepts an ISO-639-1 hint; omit for auto-detect.
      ...(language === "en" || language === "fa" ? { language } : {}),
    });

    return NextResponse.json({ text: res.text });
  } catch (err: any) {
    console.error("[voice/transcribe] error", err);
    return NextResponse.json(
      { error: err?.message || "Transcription failed." },
      { status: 500 },
    );
  }
}
