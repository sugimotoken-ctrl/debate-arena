"use client";

import { useState } from "react";
import DebateApp from "./DebateApp";
import CouncilApp from "./CouncilApp";

type Tab = "council" | "debate";

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("council");

  return (
    <div className="relative">
      {/* Decorative confetti dots near the top */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              background: c.color,
              opacity: 0.5,
              borderRadius: c.round ? "50%" : "4px",
            }}
          />
        ))}
      </div>

      <nav className="flex justify-center gap-3 py-[22px]">
        <Pill active={tab === "debate"} kind="debate" onClick={() => setTab("debate")}>
          ⚖️ Debate
        </Pill>
        <Pill active={tab === "council"} kind="council" onClick={() => setTab("council")}>
          🏛️ Council
        </Pill>
      </nav>

      {tab === "council" ? (
        <CouncilApp onSwitchToDebate={() => setTab("debate")} />
      ) : (
        <DebateApp onSwitchToCouncil={() => setTab("council")} />
      )}
    </div>
  );
}

function Pill({
  active,
  kind,
  onClick,
  children,
}: {
  active: boolean;
  kind: "debate" | "council";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeStyle =
    kind === "debate"
      ? {
          background: "linear-gradient(90deg,#FF6B4A,#FF9F1C)",
          boxShadow: "0 8px 20px rgba(255,107,74,.3)",
          color: "#fff",
        }
      : {
          background: "linear-gradient(90deg,#6C5CFF,#2E7BFF)",
          boxShadow: "0 8px 20px rgba(108,92,255,.3)",
          color: "#fff",
        };
  return (
    <button
      onClick={onClick}
      className="rounded-full font-bold text-base transition"
      style={{
        padding: "10px 22px",
        ...(active
          ? activeStyle
          : {
              background: "#fff",
              color: "#6B6B7B",
              boxShadow: "0 4px 14px rgba(20,20,28,.06)",
            }),
      }}
    >
      {children}
    </button>
  );
}

const CONFETTI = [
  { left: "6%", top: "30px", size: 12, color: "#FF6B4A", round: true },
  { left: "14%", top: "90px", size: 9, color: "#6C5CFF", round: false },
  { left: "22%", top: "50px", size: 10, color: "#12B981", round: true },
  { left: "80%", top: "40px", size: 11, color: "#2E7BFF", round: true },
  { left: "88%", top: "100px", size: 8, color: "#FF9F1C", round: false },
  { left: "72%", top: "70px", size: 13, color: "#FF4D9D", round: true },
  { left: "50%", top: "24px", size: 8, color: "#35C7F0", round: true },
];
