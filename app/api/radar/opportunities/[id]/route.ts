import { NextRequest, NextResponse } from "next/server";
import { updateOpportunity } from "@/lib/radar/store";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch: { status?: string; notes?: string } = {};
    if (typeof body?.status === "string") patch.status = body.status;
    if (typeof body?.notes === "string") patch.notes = body.notes;
    await updateOpportunity(id, patch as any);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
