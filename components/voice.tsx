"use client";

import { useRef, useState } from "react";

function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  );
}

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
      setErr("Mic access denied");
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        title={recording ? "Stop & transcribe" : title}
        className="grid place-items-center transition shrink-0"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          border: recording
            ? "1.5px solid #FF6B4A"
            : "1.5px solid rgba(108,92,255,.3)",
          background: recording ? "#FFF1EC" : "#F2F1FF",
          color: recording ? "#FF6B4A" : "#6C5CFF",
        }}
        onMouseEnter={(e) => {
          if (!recording) {
            e.currentTarget.style.background = "#6C5CFF";
            e.currentTarget.style.color = "#fff";
          }
        }}
        onMouseLeave={(e) => {
          if (!recording) {
            e.currentTarget.style.background = "#F2F1FF";
            e.currentTarget.style.color = "#6C5CFF";
          }
        }}
      >
        {busy ? (
          <span className="text-sm">…</span>
        ) : recording ? (
          <span className="w-3 h-3 rounded-[3px] bg-current animate-pulse" />
        ) : (
          <MicIcon />
        )}
      </button>
      {err && <span className="text-[11px] text-coral mt-1">{err}</span>}
    </div>
  );
}

/** Speak text aloud via OpenAI TTS. */
export function PlayButton({ text }: { text: string }) {
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
      // ignore — button resets
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={playing ? "Stop" : "Listen"}
      className="shrink-0 grid place-items-center rounded-full transition"
      style={{
        width: 30,
        height: 30,
        border: "1.5px solid rgba(108,92,255,.3)",
        background: playing ? "#6C5CFF" : "#F2F1FF",
        color: playing ? "#fff" : "#6C5CFF",
        fontSize: 12,
      }}
    >
      {loading ? "…" : playing ? "⏸" : "▶"}
    </button>
  );
}
