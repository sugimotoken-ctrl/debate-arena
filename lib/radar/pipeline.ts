// Opportunity Radar engine: gathers real reviews (Amazon + Trustpilot + Google)
// and market data (Google Trends + keyword demand), then Claude finds gaps.
// Ported from the standalone Radar app into debate-arena's Next.js backend.

import Anthropic from "@anthropic-ai/sdk";
import type { Opportunity, ScoreBreakdown, SearchMeta } from "./types";

const WEIGHTS = { demand: 40, competition: 30, feasibility: 20, timing: 10 } as const;
const MODEL = "claude-sonnet-4-6";
const PRICE_IN = 3 / 1_000_000;
const PRICE_OUT = 15 / 1_000_000;

const anthropic = new Anthropic();

const DFS_LOGIN = process.env.DATAFORSEO_LOGIN || "";
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD || "";
const DFS_AUTH = "Basic " + Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString("base64");
const OUTSCRAPER_KEY = process.env.OUTSCRAPER_API_KEY || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// DataForSEO wants a full location name ("United States"), not "US".
function locationName(region: string) {
  const r = (region || "").trim().toLowerCase();
  const map: Record<string, string> = {
    us: "United States", usa: "United States", "united states": "United States",
    uk: "United Kingdom", gb: "United Kingdom", "united kingdom": "United Kingdom",
    ca: "Canada", canada: "Canada", au: "Australia", australia: "Australia",
  };
  return map[r] || "United States";
}

async function dfsPost(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://api.dataforseo.com${path}`, {
    method: "POST",
    headers: { Authorization: DFS_AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.status_code !== 20000) throw new Error(`DataForSEO ${json.status_code}: ${json.status_message}`);
  return json;
}

async function dfsGet(path: string): Promise<any> {
  const res = await fetch(`https://api.dataforseo.com${path}`, { headers: { Authorization: DFS_AUTH } });
  return res.json();
}

async function pollGet(path: string, tries = 8, interval = 6000): Promise<any> {
  for (let i = 0; i < tries; i++) {
    await sleep(interval);
    try {
      const json = await dfsGet(path);
      const t = json.tasks?.[0];
      if (t?.status_code === 20000 && t.result?.[0]) return t.result[0];
    } catch {}
  }
  return null;
}

type ReviewItem = { source: string; business: string; rating?: number; text: string };

async function collectReviews(
  tasks: { id: string; label: string }[],
  getPath: (id: string) => string,
  source: string,
  tries = 8,
  interval = 6000,
): Promise<ReviewItem[]> {
  const reviews: ReviewItem[] = [];
  const pending = new Set(tasks.map((t) => t.id));
  for (let a = 0; a < tries && pending.size > 0; a++) {
    await sleep(interval);
    for (const t of tasks) {
      if (!pending.has(t.id)) continue;
      try {
        const json = await dfsGet(getPath(t.id));
        const task = json.tasks?.[0];
        if (task?.status_code === 20000 && task.result?.[0]) {
          for (const it of task.result[0].items || []) {
            const text = it.review_text || it.text;
            if (text) reviews.push({ source, business: t.label, rating: it.rating?.value, text: String(text).slice(0, 300) });
          }
          pending.delete(t.id);
        }
      } catch {}
    }
  }
  return reviews;
}

// --- market data ---
async function fetchKeywordData(topic: string, region: string) {
  try {
    const json = await dfsPost("/v3/keywords_data/google_ads/search_volume/live", [
      { keywords: [topic], location_name: locationName(region), language_name: "English" },
    ]);
    const r = json.tasks?.[0]?.result?.[0];
    if (!r) return null;
    const monthly = r.monthly_searches || [];
    const n = Math.max(1, Math.min(3, monthly.length));
    const recent = monthly.slice(0, 3).reduce((s: number, m: any) => s + (m.search_volume || 0), 0) / n;
    const older = monthly.slice(-3).reduce((s: number, m: any) => s + (m.search_volume || 0), 0) / n;
    const growthPct = older > 0 ? Math.round(((recent - older) / older) * 100) : null;
    return { keyword: r.keyword, searchVolume: r.search_volume, growthPct, cost: json.cost || 0 } as any;
  } catch (e: any) {
    return { error: String(e?.message || e) } as any;
  }
}

async function fetchTrends(topic: string, region: string) {
  try {
    const json = await dfsPost("/v3/keywords_data/google_trends/explore/live", [
      { keywords: [topic], location_name: locationName(region), time_range: "past_12_months" },
    ]);
    const items = json.tasks?.[0]?.result?.[0]?.items || [];
    const series = items.find((i: any) => i.type === "google_trends_graph")?.data || [];
    const vals = series.map((p: any) => (Array.isArray(p.values) ? p.values[0] : null)).filter((v: any) => v != null);
    let direction: "rising" | "flat" | "declining" = "flat";
    if (vals.length >= 4) {
      const first = vals.slice(0, Math.floor(vals.length / 3)).reduce((a: number, b: number) => a + b, 0);
      const last = vals.slice(-Math.floor(vals.length / 3)).reduce((a: number, b: number) => a + b, 0);
      if (last > first * 1.15) direction = "rising";
      else if (last < first * 0.85) direction = "declining";
    }
    return { direction, cost: json.cost || 0 } as any;
  } catch (e: any) {
    return { error: String(e?.message || e) } as any;
  }
}

// --- reviews: Google Maps ---
async function fetchBusinesses(topic: string, region: string, top = 2) {
  try {
    const json = await dfsPost("/v3/serp/google/maps/live/advanced", [
      { keyword: topic, location_name: locationName(region), language_name: "English", depth: 20 },
    ]);
    const items = json.tasks?.[0]?.result?.[0]?.items || [];
    const ranked = items
      .filter((i: any) => i.cid && i.title)
      .sort((a: any, b: any) => (b.rating?.votes_count || 0) - (a.rating?.votes_count || 0))
      .slice(0, top)
      .map((i: any) => ({ title: i.title, cid: String(i.cid) }));
    return { businesses: ranked, cost: json.cost || 0 };
  } catch {
    return { businesses: [], cost: 0 };
  }
}

async function fetchGoogleReviews(topic: string, region: string, topBiz = 2, depth = 40) {
  const biz = await fetchBusinesses(topic, region, topBiz);
  let cost = biz.cost || 0;
  if (!biz.businesses.length) return { reviews: [] as ReviewItem[], cost };
  const location = locationName(region);
  const tasks: { id: string; label: string }[] = [];
  for (const b of biz.businesses) {
    try {
      const json = await dfsPost("/v3/business_data/google/reviews/task_post", [
        { cid: b.cid, location_name: location, language_name: "English", depth },
      ]);
      cost += json.cost || 0;
      const id = json.tasks?.[0]?.id;
      if (id) tasks.push({ id, label: b.title });
    } catch {}
  }
  const reviews = await collectReviews(tasks, (id) => `/v3/business_data/google/reviews/task_get/${id}`, "Google reviews");
  return { reviews, cost };
}

// --- reviews: Trustpilot (brands from organic SERP) ---
const NON_BRAND =
  /reddit|youtube|wikipedia|quora|facebook|instagram|tiktok|twitter|pinterest|linkedin|nytimes|menshealth|womenshealth|amazon|ebay|walmart|target\.com|google|bing|yelp|tripadvisor|forbes|cnet|cnn|bbc|wired|techradar|tomsguide|businessinsider|insider\.com|seriouseats|bonappetit|epicurious|foodnetwork|allrecipes|tasteofhome|thekitchn|delish|eatingwell|healthline|verywell|goodhousekeeping|realsimple|prevention|self\.com|shape\.com|today\.com|msn|yahoo|medium\.com|substack|wikihow|mashable|theverge|engadget|pcmag|nerdwallet|investopedia|consumerreports|trustpilot|glassdoor|indeed|g2\.com|capterra|\.gov|\.edu/i;

async function fetchBrandDomains(topic: string, region: string, top = 4) {
  try {
    const json = await dfsPost("/v3/serp/google/organic/live/advanced", [
      { keyword: topic, location_name: locationName(region), language_name: "English", depth: 20 },
    ]);
    const items = json.tasks?.[0]?.result?.[0]?.items || [];
    const domains = [
      ...new Set(
        items
          .filter((i: any) => i.type === "organic" && i.domain && !NON_BRAND.test(i.domain))
          .map((i: any) => i.domain.replace(/^www\./, "")),
      ),
    ].slice(0, top) as string[];
    return { domains, cost: json.cost || 0 };
  } catch {
    return { domains: [] as string[], cost: 0 };
  }
}

async function fetchTrustpilotReviews(domains: string[], depth = 60) {
  let cost = 0;
  const tasks: { id: string; label: string }[] = [];
  for (const domain of domains) {
    try {
      const json = await dfsPost("/v3/business_data/trustpilot/reviews/task_post", [{ domain, depth }]);
      cost += json.cost || 0;
      const id = json.tasks?.[0]?.id;
      if (id) tasks.push({ id, label: domain });
    } catch {}
  }
  const reviews = await collectReviews(tasks, (id) => `/v3/business_data/trustpilot/reviews/task_get/${id}`, "Trustpilot");
  return { reviews, companies: domains, cost };
}

// --- reviews: Amazon (ASINs via DataForSEO, text via Outscraper) ---
async function outscraperAmazonReviews(asin: string, limit = 25): Promise<ReviewItem[]> {
  const url = `https://api.outscraper.com/amazon/reviews?query=${encodeURIComponent(asin)}&limit=${limit}&async=false`;
  const res = await fetch(url, { headers: { "X-API-KEY": OUTSCRAPER_KEY } });
  if (!res.ok) return [];
  const json = await res.json();
  const arr = (json.data && json.data[0]) || [];
  return arr
    .filter((r: any) => r.body)
    .map((r: any) => ({ source: "Amazon", business: r.title || asin, rating: r.rating, text: String(r.body).slice(0, 300) }));
}

async function fetchAmazonReviews(topic: string, region: string, top = 3) {
  if (!OUTSCRAPER_KEY) return { reviews: [] as ReviewItem[], cost: 0 };
  let cost = 0;
  const post = await dfsPost("/v3/merchant/amazon/products/task_post", [
    { keyword: topic, location_name: locationName(region), language_code: "en_US" },
  ]).catch(() => null);
  cost += post?.cost || 0;
  const id = post?.tasks?.[0]?.id;
  if (!id) return { reviews: [], cost };
  const result = await pollGet(`/v3/merchant/amazon/products/task_get/advanced/${id}`);
  const asins = (result?.items || [])
    .map((i: any) => ({ asin: i.data_asin || i.asin, votes: i.rating?.votes_count || 0 }))
    .filter((i: any) => i.asin && i.votes > 50)
    .sort((a: any, b: any) => b.votes - a.votes)
    .slice(0, top)
    .map((i: any) => i.asin);
  if (!asins.length) return { reviews: [], cost };
  const batches = await Promise.all(asins.map((a: string) => outscraperAmazonReviews(a).catch(() => [])));
  return { reviews: batches.flat(), cost };
}

// --- Claude analysis ---
const PROMPT = `You find concrete business opportunities in a specific market a founder named,
grounded ONLY in the real evidence provided below. Do not invent statistics.

Topic: {{TOPIC}}
Region: {{REGION}}

You are given REVIEWS (real customer reviews of actual businesses/products) plus
TRENDS and KEYWORDS (real demand data). Find 3-5 distinct, non-obvious
opportunities a small, scrappy team could start. For each, quantify what
customers say using ONLY the REVIEWS — e.g. "of 60 reviews analysed, roughly 30%
mention wanting X". Base every percentage on the actual items, round to whole
percents, and omit a signal if there's no evidence for it.

Score each idea on four dimensions with an integer score (0..max) and a one-line reason:
- demand (0..{{MAX_DEMAND}}), competition (0..{{MAX_COMPETITION}}), feasibility (0..{{MAX_FEASIBILITY}}), timing (0..{{MAX_TIMING}}).

Return STRICT JSON only, no prose, no markdown fences, in this exact shape:
{ "opportunities": [ {
  "title": "the idea, one line",
  "problem_statement": "one sentence",
  "target_customer": "who would pay",
  "urgency": "time_limited" | "durable",
  "next_validation_step": "one cheap, concrete test",
  "review_signals": [ { "label": "what a share of people said", "pct": 30, "source": "Amazon" } ],
  "scores": { "demand": {"score":0,"reason":""}, "competition": {"score":0,"reason":""}, "feasibility": {"score":0,"reason":""}, "timing": {"score":0,"reason":""} },
  "evidence": [ { "kind": "metric", "label": "short", "value": "detail" } ]
} ] }

REVIEWS ({{REVIEW_COUNT}} items):
{{REVIEWS}}

TRENDS:
{{TRENDS}}

KEYWORDS:
{{KEYWORDS}}`;

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  raw = raw.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {}
  const m = raw.match(/"opportunities"\s*:\s*\[/);
  if (m) {
    const arrStart = (m.index || 0) + m[0].length;
    const objs: string[] = [];
    let depth = 0, objStart = -1, inStr = false, esc = false;
    for (let i = arrStart; i < raw.length; i++) {
      const ch = raw[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") { if (depth === 0) objStart = i; depth++; }
      else if (ch === "}") { depth--; if (depth === 0 && objStart >= 0) objs.push(raw.slice(objStart, i + 1)); }
      else if (ch === "]" && depth === 0) break;
    }
    const parsed: any[] = [];
    for (const o of objs) { try { parsed.push(JSON.parse(o)); } catch {} }
    if (parsed.length) return { opportunities: parsed };
  }
  throw new Error("Could not parse model output");
}

function dim(s: any, key: string, max: number) {
  return { score: Math.max(0, Math.min(max, Math.round(s?.[key]?.score ?? 0))), max, reason: s?.[key]?.reason || "" };
}

export async function runGuidedSearch(
  topic: string,
  region: string,
): Promise<{ opportunities: Omit<Opportunity, "id">[]; meta: SearchMeta }> {
  const query = region ? `${topic} · ${region}` : topic;

  const brands = await fetchBrandDomains(topic, region);
  const [google, trustpilot, amazon, keywords, trends] = await Promise.all([
    fetchGoogleReviews(topic, region, 2),
    fetchTrustpilotReviews(brands.domains),
    fetchAmazonReviews(topic, region),
    fetchKeywordData(topic, region),
    fetchTrends(topic, region),
  ]);
  const reviews = [...amazon.reviews, ...trustpilot.reviews, ...google.reviews].slice(0, 320);

  if (reviews.length === 0 && (!keywords || keywords.error) && (!trends || trends.error)) {
    throw new Error("Could not gather any data for that topic. Try rephrasing.");
  }

  const reviewsText = reviews.length
    ? reviews.map((r, i) => `[${i + 1}] (${r.rating ?? "?"}★, ${r.business}) ${r.text}`).join("\n")
    : "(no reviews found)";
  const trendsText = trends?.error ? "unavailable" : `Google Trends for "${topic}": ${trends.direction} over 12 months.`;
  const kwText =
    keywords?.error || !keywords
      ? "unavailable"
      : `"${keywords.keyword}": ${keywords.searchVolume ?? "n/a"} searches/mo, recent growth ${keywords.growthPct != null ? keywords.growthPct + "%" : "n/a"}.`;

  const prompt = PROMPT.replaceAll("{{TOPIC}}", topic)
    .replaceAll("{{REGION}}", region || "")
    .replaceAll("{{MAX_DEMAND}}", String(WEIGHTS.demand))
    .replaceAll("{{MAX_COMPETITION}}", String(WEIGHTS.competition))
    .replaceAll("{{MAX_FEASIBILITY}}", String(WEIGHTS.feasibility))
    .replaceAll("{{MAX_TIMING}}", String(WEIGHTS.timing))
    .replaceAll("{{REVIEW_COUNT}}", String(reviews.length))
    .replaceAll("{{REVIEWS}}", reviewsText)
    .replaceAll("{{TRENDS}}", trendsText)
    .replaceAll("{{KEYWORDS}}", kwText);

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const parsed = extractJson(text);
  const usage = msg.usage || ({} as any);
  const claudeCost = (usage.input_tokens || 0) * PRICE_IN + (usage.output_tokens || 0) * PRICE_OUT;

  const now = new Date().toISOString();
  const reviewSources: string[] = [];
  if (amazon.reviews.length) reviewSources.push("Amazon");
  if (trustpilot.reviews.length) reviewSources.push("Trustpilot");
  if (google.reviews.length) reviewSources.push("Google reviews");
  const vocCount = reviews.length;

  const opportunities: Omit<Opportunity, "id">[] = (parsed.opportunities || []).map((o: any) => {
    const s = o.scores || {};
    const scores: ScoreBreakdown = {
      demand: dim(s, "demand", WEIGHTS.demand) as any,
      competition: dim(s, "competition", WEIGHTS.competition) as any,
      feasibility: dim(s, "feasibility", WEIGHTS.feasibility) as any,
      timing: dim(s, "timing", WEIGHTS.timing) as any,
    };
    const scoreTotal = scores.demand.score + scores.competition.score + scores.feasibility.score + scores.timing.score;
    return {
      sourceModule: "guided",
      title: o.title || "Untitled opportunity",
      problemStatement: o.problem_statement || "",
      targetCustomer: o.target_customer || "",
      evidence: Array.isArray(o.evidence) ? o.evidence : [],
      scores,
      scoreTotal,
      urgency: o.urgency === "time_limited" ? "time_limited" : "durable",
      nextValidationStep: o.next_validation_step || "",
      status: "new",
      notes: "",
      matchCount: vocCount,
      createdAt: now,
      searchQuery: query,
      reviewsAnalyzed: vocCount > 0 ? vocCount : undefined,
      reviewSources: vocCount > 0 ? reviewSources : undefined,
      reviewSignals:
        vocCount > 0
          ? (o.review_signals || []).map((r: any) => ({
              label: r.label || "",
              pct: Math.max(0, Math.min(100, Math.round(r.pct ?? 0))),
              source: r.source || "reviews",
            }))
          : undefined,
    };
  });

  const ratingDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of reviews) {
    const k = String(Math.round(r.rating || 0));
    if (ratingDistribution[k] != null) ratingDistribution[k]++;
  }

  const dfsCost =
    (keywords?.cost || 0) + (trends?.cost || 0) + (brands.cost || 0) + (google.cost || 0) + (trustpilot.cost || 0) + (amazon.cost || 0);
  const estCost = claudeCost + dfsCost;

  const meta: SearchMeta = {
    query,
    reviewCount: reviews.length,
    sourceBreakdown: { amazon: amazon.reviews.length, trustpilot: trustpilot.reviews.length, google: google.reviews.length, reddit: 0 },
    ratingDistribution,
    trends: trends?.error ? null : trends?.direction,
    keyword: keywords?.error ? null : { volume: keywords?.searchVolume, growthPct: keywords?.growthPct },
    estCostUsd: Number(estCost.toFixed(4)),
  };

  return { opportunities, meta };
}
