import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import GatedHeader from "@/components/GatedHeader";
import RadarApp from "@/components/radar/RadarApp";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");

  return (
    <>
      <GatedHeader profile={profile} />
      <RadarApp />
    </>
  );
}
