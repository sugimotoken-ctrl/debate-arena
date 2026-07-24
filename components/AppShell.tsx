"use client";

import { useState } from "react";
import DebateApp from "./DebateApp";
import CouncilApp from "./CouncilApp";

type Tab = "debate" | "council";

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("debate");

  return (
    <div>
      <nav className="sticky top-0 z-10 backdrop-blur bg-slate-950/70 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <TabButton active={tab === "debate"} onClick={() => setTab("debate")}>
            ⚖️ Debate
          </TabButton>
          <TabButton
            active={tab === "council"}
            onClick={() => setTab("council")}
          >
            🏛️ Council
          </TabButton>
        </div>
      </nav>

      {tab === "debate" ? <DebateApp /> : <CouncilApp />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
        active
          ? "border-white text-white"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
