import { NextRequest, NextResponse } from "next/server";
import { runGuidedSearch } from "@/lib/radar/pipeline";
import { saveOpportunities } from "@/lib/radar/store";
import { getProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300; // the review fetch can take 1-2 minutes

export async function POST(req: NextRequest) {
  try {
    // Only signed-in, approved users can trigger a paid search.
    const profile = await getProfile();
    if (!profile || profile.status !== "approved") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = String(body?.topic || "").trim();
    const region = String(body?.region || "").trim();
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 });

    const { opportunities, meta } = await runGuidedSearch(topic, region);
    const saved = await saveOpportunities(opportunities);
    return NextResponse.json({ opportunities: saved, meta });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
