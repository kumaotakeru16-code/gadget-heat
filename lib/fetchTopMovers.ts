// Server-only: aggregates Rakuten results for active markets into Product[].
// Never import this from client components.

import { searchRakuten, RakutenProduct } from "./rakuten";
import { SEARCH_SEEDS } from "@/data/searchSeeds";
import { Product } from "@/data/products";

// Markets with validated Rakuten data quality in the current MVP.
const RAKUTEN_ACTIVE_MARKET_IDS = ["audio", "support"];

function toProduct(p: RakutenProduct): Product {
  return {
    id:               p.id,
    name:             p.name,
    brand:            p.brand ?? "",
    market:           p.market,
    cat:              p.cat,
    score:            p.score,
    scoreChg:         p.scoreChg,
    scoreChg24h:      p.scoreChg24h,
    reviewsDelta:     p.reviewsDelta,
    reviewsVelocity:  p.reviewsVelocity,
    rating:           p.rating,
    ratingChg:        p.ratingChg,
    rankUp:           p.rankUp,
    isNew:            p.isNew,
    priceChg:         p.priceChg,
    price:            p.price,
    aux:              p.aux,
    spark:            p.spark,
    color:            p.color,
    imageUrl:         p.imageUrl,
    itemUrl:          p.itemUrl,
    rawReviewCount:   p.rawReviewCount,
  };
}

export async function fetchTopMovers(): Promise<Product[] | null> {
  try {
    const activeSeeds = SEARCH_SEEDS.filter((m) =>
      RAKUTEN_ACTIVE_MARKET_IDS.includes(m.marketId)
    );

    const seedCalls = activeSeeds.flatMap((m) =>
      m.seeds.map((seed) => ({ marketId: m.marketId, seed }))
    );

    // Fetch all seeds in parallel — ISR cache (10 min) prevents rate-limit issues.
    const results = await Promise.allSettled(
      seedCalls.map(({ marketId, seed }) =>
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
    const products: Product[] = [];

    for (const result of results) {
      if (result.status === "rejected") continue;
      for (const item of result.value.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        products.push(toProduct(item));
      }
    }

    if (products.length === 0) return null;

    return products.sort((a, b) => b.score - a.score);
  } catch {
    return null;
  }
}

export { RAKUTEN_ACTIVE_MARKET_IDS };
