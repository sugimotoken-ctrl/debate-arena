import Link from "next/link";
import LogoutButton from "./LogoutButton";
import type { Profile } from "@/lib/auth";

export default function GatedHeader({ profile }: { profile: Profile }) {
  return (
    <header
      className="sticky top-0 z-10"
      style={{
        background: "rgba(246,247,251,.8)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(20,20,28,.08)",
      }}
    >
      <div
        className="mx-auto flex items-center gap-4"
        style={{ maxWidth: 1000, padding: "12px 24px" }}
      >
        <Link
          href="/rooms"
          className="font-display"
          style={{ fontSize: 18, color: "#14141C" }}
        >
          🏛️ Meeting Rooms
        </Link>
        {profile.role === "admin" && (
          <Link
            href="/admin"
            style={{ fontSize: 14, fontWeight: 600, color: "#6C5CFF" }}
          >
            Admin
          </Link>
        )}
        <Link
          href="/debate"
          style={{ fontSize: 14, fontWeight: 600, color: "#6B6B7B" }}
        >
          ⚖️ Debate
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span style={{ fontSize: 13, color: "#8A8A9A" }}>
            {profile.full_name || profile.email}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
