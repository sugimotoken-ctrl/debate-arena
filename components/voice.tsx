"use client";

import { useRef, useState } from "react";

/** Record from the mic, transcribe via OpenAI, and hand back the text. */
export function MicButton({
  onText,
  language,
  title = "Record voice",
}: {
  onText: (text: string) => void;
  language: string;
  title?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          fd.append("language", language);
          const r = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: fd,
          });
          const j = await r.json();
          if (j.error) throw new Error(j.error);
          if (j.text) onText(String(j.text).trim());
        } catch (e: any) {
          setErr(e?.message || "Transcription failed");
        } finally {
          setBusy(false);
        }
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch {
      setErr("Microphone access denied");
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        title={recording ? "Stop & transcribe" : title}
        className={`shrink-0 rounded-lg px-2.5 py-2 text-sm border transition ${
          recording
            ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
        }`}
      >
        {busy ? "…" : recording ? "⏹" : "🎤"}
      </button>
      {err && <span className="text-xs text-rose-400">{err}</span>}
    </span>
  );
}

/** Speak text aloud via OpenAI TTS. */
export function PlayButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function toggle() {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error("tts failed");
      const buf = await r.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };
      await a.play();
      setPlaying(true);
    } catch {
      // ignore — button just resets
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={playing ? "Stop" : "Listen"}
      className={
        className ||
        "shrink-0 rounded-full w-7 h-7 grid place-items-center text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500"
      }
    >
      {loading ? "…" : playing ? "⏸" : "▶"}
    </button>
  );
}
