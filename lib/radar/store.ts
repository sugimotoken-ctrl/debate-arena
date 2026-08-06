// Persists Radar opportunities in debate-arena's existing Supabase (radar_ table).
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Opportunity, OpportunityStatus } from "./types";

const TABLE = "radar_opportunities";

function oppToRow(o: Omit<Opportunity, "id">) {
  return {
    source_module: o.sourceModule,
    title: o.title,
    score_total: o.scoreTotal,
    status: o.status,
    notes: o.notes,
    search_query: o.searchQuery ?? null,
    data: o,
  };
}

function rowToOpp(row: any): Opportunity {
  return { ...row.data, id: row.id, status: row.status, notes: row.notes };
}

export async function listOpportunities(): Promise<Opportunity[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .select("id,status,notes,data,score_total")
    .order("score_total", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToOpp);
}

export async function saveOpportunities(opps: Omit<Opportunity, "id">[]): Promise<Opportunity[]> {
  if (!opps.length) return [];
  const db = supabaseAdmin();
  const { data, error } = await db.from(TABLE).insert(opps.map(oppToRow)).select("id,status,notes,data");
  if (error) {
    console.error("radar save:", error.message);
    return opps as unknown as Opportunity[];
  }
  return (data || []).map(rowToOpp);
}

export async function updateOpportunity(id: string, patch: { status?: OpportunityStatus; notes?: string }) {
  const db = supabaseAdmin();
  const { error } = await db
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
