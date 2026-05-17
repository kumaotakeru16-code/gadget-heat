// Server-only: aggregates top products for active markets from the
// locale-appropriate source.  Never import from client components.
//
// Gadget Heat source architecture:
//   jp → Rakuten  (レビュー・評価・価格データ)
//   en → Best Buy (stub; EN catalog data, coming later)
//
// Image overrides (data/imageOverrides.ts) apply regardless of source.

import { sourceForLocale } from "./sources";
import { enrichWithDeltas } from "./snapshots";
import { SEARCH_SEEDS } from "@/data/searchSeeds";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

// Markets with validated data quality in the current JP MVP.
// Expand when additional markets are validated.
export const RAKUTEN_ACTIVE_MARKET_IDS = ["audio", "support"];

export async function fetchTopMovers(
  locale: LocaleCode = "jp"
): Promise<Product[] | null> {
  try {
    const source = sourceForLocale(locale);

    const activeSeeds = SEARCH_SEEDS.filter((m) =>
      RAKUTEN_ACTIVE_MARKET_IDS.includes(m.marketId)
    );

    const seedCalls = activeSeeds.flatMap((m) =>
      m.seeds.map((seed) => ({ marketId: m.marketId, seed }))
    );

    // Fetch all seeds in parallel — ISR cache (10 min) prevents rate-limit issues.
    const results = await Promise.allSettled(
      seedCalls.map(({ marketId, seed }) =>
        source.searchProducts({
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
      for (const item of result.value) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        products.push(item);
      }
    }

    if (products.length === 0) return null;

    const sorted = products.sort((a, b) => b.score - a.score);

    // Enrich with yesterday's snapshot deltas if Supabase is configured.
    // Falls back to the raw sorted list if Supabase is absent or unreachable.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const today = new Date().toISOString().slice(0, 10);
      return enrichWithDeltas(sorted, today);
    }

    return sorted;
  } catch {
    return null;
  }
}
