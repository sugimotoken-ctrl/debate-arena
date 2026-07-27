import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function PendingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/rooms");

  const rejected = profile.status === "rejected";

  return (
    <div
      className="mx-auto px-6 text-center"
      style={{ maxWidth: 480, paddingTop: 100 }}
    >
      <div style={{ fontSize: 52 }}>{rejected ? "🚫" : "⏳"}</div>
      <h1
        className="font-display mt-3"
        style={{ fontSize: 34, color: "#14141C" }}
      >
        {rejected ? "Access not granted" : "Waiting for approval"}
      </h1>
      <p className="mt-3" style={{ color: "#5C5C6E", fontSize: 16, lineHeight: 1.6 }}>
        {rejected
          ? "An admin has not granted your account access to the meeting rooms."
          : `Hi ${profile.full_name || profile.email}! Your account is created. An admin needs to approve you before you can join meeting rooms.`}
      </p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
