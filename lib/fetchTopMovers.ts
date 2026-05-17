// Server-only: fetches and enriches top products across all active markets.
// Returns { products, stats } so every layer (page → Hero → colophon) uses
// the same numbers — no mocks, no separate counts.

import "server-only";

import { fetchByCategories } from "./categoryFetch";
import type { FetchStats, CategoryFetchResult } from "./categoryFetch";
import { enrichWithDeltas } from "./snapshots";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

export type { FetchStats };

export interface TopMoversResult {
  products: Product[];
  stats:    FetchStats;
}

export async function fetchTopMovers(
  locale: LocaleCode = "jp"
): Promise<TopMoversResult | null> {
  try {
    const { products, stats }: CategoryFetchResult = await fetchByCategories(locale);
    if (products.length === 0) return null;

    // Enrich with Supabase snapshot deltas when configured.
    // Falls back to raw products if Supabase is absent or unreachable.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const today    = new Date().toISOString().slice(0, 10);
      const enriched = await enrichWithDeltas(products, today);
      // Recompute delta-dependent stats after enrichment
      const totalReviewsDelta = enriched.reduce((s, p) => s + (p.reviewsDelta ?? 0), 0);
      return {
        products: enriched,
        stats: { ...stats, totalReviewsDelta },
      };
    }

    return { products, stats };
  } catch {
    return null;
  }
}
