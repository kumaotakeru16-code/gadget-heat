// Server-only: category-sweep product fetcher.
// Replaces the old seed-only approach with per-market keyword expansion
// and multi-page fetching, yielding 100-300 quality-filtered products.
//
// Quality thresholds (tighter than the low-signal filter in rakuten.ts):
//   MIN_REVIEW_COUNT = 5   (vs 3 in isLowSignal)
//   MIN_RATING       = 3.8 (vs 0 in isLowSignal)
//
// These are intentionally conservative — Gadget Heat surfaces "heat", not
// just availability. Low-review or low-rated products dilute the signal.

import "server-only";

import { sourceForLocale } from "./sources";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

const MIN_REVIEW_COUNT = 5;
const MIN_RATING       = 3.8;
const MAX_PRODUCTS     = 300;

function meetsQuality(p: Product): boolean {
  return (
    (p.rawReviewCount ?? 0) >= MIN_REVIEW_COUNT &&
    p.rating >= MIN_RATING
  );
}

/**
 * Fetches products across all markets defined in MARKET_CATEGORIES.
 * Each market's keywords are swept in parallel.  Products are deduped by ID,
 * quality-filtered, scored, and capped at MAX_PRODUCTS.
 */
export async function fetchByCategories(
  locale: LocaleCode = "jp"
): Promise<Product[]> {
  const source = sourceForLocale(locale);

  // Expand market categories into a flat list of (market, keyword, cat, page) calls.
  const calls: { marketId: string; keyword: string; cat: string; page: number }[] = [];

  for (const market of MARKET_CATEGORIES) {
    for (const entry of market.categories) {
      const pages = Math.min(entry.pages ?? 1, 3); // cap at 3 to avoid runaway requests
      for (let page = 1; page <= pages; page++) {
        calls.push({
          marketId: market.marketId,
          keyword:  entry.keyword,
          cat:      entry.cat,
          page,
        });
      }
    }
  }

  // All calls fire in parallel.  ISR cache (10 min) means each unique URL is
  // only actually fetched once per revalidation window — no rate-limit risk.
  const results = await Promise.allSettled(
    calls.map(({ marketId, keyword, cat, page }) =>
      source.searchProducts({
        keyword,
        market: marketId,
        cat,
        hits:   30,
        page,
      })
    )
  );

  const seen     = new Set<string>();
  const products: Product[] = [];

  for (const result of results) {
    if (result.status === "rejected") continue;
    for (const p of result.value) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (!meetsQuality(p)) continue;
      products.push(p);
    }
  }

  return products
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PRODUCTS);
}
