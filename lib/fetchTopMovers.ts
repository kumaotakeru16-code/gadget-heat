// Server-only: fetches and enriches top products across all active markets.
// Data source: categoryFetch (multi-market keyword sweep) → Supabase delta enrichment.
// Never import from client components.

import "server-only";

import { fetchByCategories } from "./categoryFetch";
import { enrichWithDeltas } from "./snapshots";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

export async function fetchTopMovers(
  locale: LocaleCode = "jp"
): Promise<Product[] | null> {
  try {
    const products = await fetchByCategories(locale);
    if (products.length === 0) return null;

    // Enrich with yesterday's snapshot deltas if Supabase is configured.
    // Falls back to the raw sorted list if Supabase is absent or unreachable.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const today = new Date().toISOString().slice(0, 10);
      return enrichWithDeltas(products, today);
    }

    return products;
  } catch {
    return null;
  }
}
