import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/radar/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const opportunities = await listOpportunities();
    return NextResponse.json({ persisted: true, opportunities });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
