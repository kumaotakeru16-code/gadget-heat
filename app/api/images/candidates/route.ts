import { NextRequest, NextResponse } from "next/server";
import { searchRakuten, RakutenProduct } from "@/lib/rakuten";
import {
  isAmazonConfigured,
  searchAmazonImageCandidates,
} from "@/lib/imageSources/amazon";
import { buildProductKey, buildImageSearchQuery } from "@/lib/productKey";
import { SEARCH_SEEDS } from "@/data/searchSeeds";

export const runtime = "nodejs";

// Minimum confidence to include a candidate in the response.
const MIN_CONFIDENCE = 0.7;

// Fetches Rakuten top products for a market, deduplicated and score-sorted.
async function fetchMarketProducts(
  marketId: string,
  limit: number
): Promise<RakutenProduct[]> {
  const marketSeeds = SEARCH_SEEDS.find((m) => m.marketId === marketId);
  if (!marketSeeds) return [];

  const results = await Promise.allSettled(
    marketSeeds.seeds.map((seed) =>
      searchRakuten({
        keyword: seed.keyword,
        market:  marketId,
        cat:     seed.cat,
        hits:    5,
        page:    1,
      })
    )
  );

  const seen     = new Set<string>();
  const products: RakutenProduct[] = [];

  for (const r of results) {
    if (r.status === "rejected") continue;
    for (const item of r.value.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      products.push(item);
    }
  }

  return products.sort((a, b) => b.score - a.score).slice(0, limit);
}

// GET /api/images/candidates
//
// ?market=audio&limit=5  → top 5 audio products + Amazon image candidates
//
// Returns 503 when Amazon credentials are not configured.
// Returns 400 when market is invalid.
// Candidates are filtered to confidence >= 0.7; sorted by confidence desc.
// Results are for review only — not auto-applied to imageOverrides.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const marketId = searchParams.get("market") ?? "audio";
  const limit    = Math.min(Number(searchParams.get("limit") ?? "10"), 20);

  if (!isAmazonConfigured()) {
    return NextResponse.json(
      {
        error:  "Amazon credentials not configured",
        detail: "Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG in .env.local.",
      },
      { status: 503 }
    );
  }

  const marketSeeds = SEARCH_SEEDS.find((m) => m.marketId === marketId);
  if (!marketSeeds) {
    return NextResponse.json(
      {
        error:     `Market "${marketId}" not found`,
        available: SEARCH_SEEDS.map((m) => m.marketId),
      },
      { status: 400 }
    );
  }

  try {
    const products = await fetchMarketProducts(marketId, limit);

    const itemResults = await Promise.allSettled(
      products.map(async (product) => {
        const productKey = buildProductKey(product);
        const query      = buildImageSearchQuery(product);

        const raw        = await searchAmazonImageCandidates(query, productKey);
        const candidates = raw
          .filter((c) => c.confidence >= MIN_CONFIDENCE)
          .sort((a, b) => b.confidence - a.confidence);

        return {
          productKey,
          rakutenName:       product.name,
          market:            product.market,
          cat:               product.cat,
          rakutenScore:      product.score,
          rakutenReviews:    product.rawReviewCount,
          rakutenRating:     product.rating,
          imageSearchQuery:  query,
          candidateCount:    candidates.length,
          candidates,
        };
      })
    );

    const items = itemResults
      .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> =>
        r.status === "fulfilled"
      )
      .map((r) => r.value);

    return NextResponse.json({
      generatedAt:   new Date().toISOString(),
      market:        marketId,
      marketName:    marketSeeds.marketName,
      minConfidence: MIN_CONFIDENCE,
      productCount:  items.length,
      note:          "Candidates are for review only. Add to imageOverrides.ts manually after verification.",
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Candidate generation failed", detail: message },
      { status: 502 }
    );
  }
}
