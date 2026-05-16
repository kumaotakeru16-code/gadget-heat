import { NextRequest, NextResponse } from "next/server";
import { searchRakuten, RakutenProduct } from "@/lib/rakuten";
import { SEARCH_SEEDS, seedsForMarket, MarketSeeds } from "@/data/searchSeeds";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopItem {
  id: string;
  name: string;
  rawReviewCount: number;
  rating: number;
  price: number;
  score: number;
  imageUrl?: string;
  itemUrl: string;
}

interface SeedResult {
  keyword: string;
  cat: string;
  meta: { count: number; page: number; pageCount: number } | null;
  topItems: TopItem[];
  error: string | null;
}

interface MarketResult {
  marketId: string;
  marketName: string;
  seeds: SeedResult[];
}

interface SeedTestResponse {
  testedAt: string;
  mode: "single-market" | "all-markets";
  hitsPerSeed: number;
  markets: MarketResult[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toTopItem(p: RakutenProduct): TopItem {
  return {
    id:             p.id,
    name:           p.name,
    rawReviewCount: p.rawReviewCount,
    rating:         p.rating,
    price:          p.price,
    score:          p.score,
    imageUrl:       p.imageUrl,
    itemUrl:        p.itemUrl,
  };
}

// Run one seed — never throws; captures errors per seed.
async function runSeed(
  marketId: string,
  seed: { keyword: string; cat: string },
  hits: number
): Promise<SeedResult> {
  try {
    const result = await searchRakuten({
      keyword: seed.keyword,
      market:  marketId,
      cat:     seed.cat,
      hits,
      page:    1,
    });
    return {
      keyword:  seed.keyword,
      cat:      seed.cat,
      meta:     result.meta,
      topItems: result.items.map(toTopItem),
      error:    null,
    };
  } catch (err) {
    return {
      keyword:  seed.keyword,
      cat:      seed.cat,
      meta:     null,
      topItems: [],
      error:    err instanceof Error ? err.message : String(err),
    };
  }
}

// Run all seeds for one market sequentially, 1200 ms apart.
async function runMarket(
  market: MarketSeeds,
  hits: number,
  seedSubset?: number          // undefined = all seeds
): Promise<MarketResult> {
  const seeds = seedSubset != null
    ? market.seeds.slice(0, seedSubset)
    : market.seeds;

  const seedResults: SeedResult[] = [];
  for (let i = 0; i < seeds.length; i++) {
    if (i > 0) await sleep(1200);  // rate-limit headroom
    seedResults.push(await runSeed(market.marketId, seeds[i], hits));
  }

  return {
    marketId:   market.marketId,
    marketName: market.marketName,
    seeds:      seedResults,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

// GET /api/rakuten/seed-test
//
// ?market=audio&hits=5   → test all seeds for Creator Audio, 5 items each
// ?market=storage&hits=5 → test all seeds for Creator Storage
// ?hits=3                → test first seed of every market, 3 items each
//
// Caching: results cached 10 min server-side (via searchRakuten's fetch options)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const marketParam = searchParams.get("market") ?? null;
  const hits = Math.min(Number(searchParams.get("hits") ?? "3"), 10);
  // Safety cap: 10 items per seed in seed-test mode

  // ── Single market ─────────────────────────────────────────────────────────
  if (marketParam) {
    const marketDef = seedsForMarket(marketParam);
    if (!marketDef) {
      return NextResponse.json(
        {
          error: `Market "${marketParam}" not found.`,
          available: SEARCH_SEEDS.map((m) => m.marketId),
        },
        { status: 400 }
      );
    }

    try {
      const result = await runMarket(marketDef, hits);
      const body: SeedTestResponse = {
        testedAt:    new Date().toISOString(),
        mode:        "single-market",
        hitsPerSeed: hits,
        markets:     [result],
      };
      return NextResponse.json(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Seed test failed", detail: message },
        { status: 502 }
      );
    }
  }

  // ── All markets (first seed only, lighter call) ───────────────────────────
  const allResults: MarketResult[] = [];
  for (let i = 0; i < SEARCH_SEEDS.length; i++) {
    if (i > 0) await sleep(1500);  // extra spacing when iterating all markets
    allResults.push(await runMarket(SEARCH_SEEDS[i], hits, 1));
  }

  const body: SeedTestResponse = {
    testedAt:    new Date().toISOString(),
    mode:        "all-markets",
    hitsPerSeed: hits,
    markets:     allResults,
  };
  return NextResponse.json(body);
}
