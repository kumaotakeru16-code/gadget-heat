// Server-only: snapshot persistence and delta computation for Gadget Heat
// trend scoring.  Never import from client components.
//
// Flow:
//   1. Admin cron calls saveProductSnapshots() with live Rakuten data.
//   2. computeDeltas() joins today vs. yesterday rows to produce scoreChg,
//      reviewsDelta, reviewsVelocity, rankUp and a fresh trend score.
//   3. fetchTopMovers() (already implemented) uses the enriched Product list.

import "server-only";

import { getSupabase } from "./supabase";
import { buildProductKey } from "./productKey";
import type { Product } from "@/data/products";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotRow {
  source:        string;
  product_id:    string;
  product_key:   string;
  market:        string;
  cat:           string | null;
  name:          string | null;
  brand:         string | null;
  price:         number | null;
  rating:        number | null;
  review_count:  number | null;
  score:         number | null;
  image_url:     string | null;
  item_url:      string | null;
}

export interface SnapshotDiff {
  product_key:      string;
  name:             string | null;
  market:           string;
  cat:              string | null;
  brand:            string | null;
  today:            SnapshotRow;
  yesterday:        SnapshotRow | null;
  reviewsDelta:     number;
  reviewsVelocity:  number;  // reviews / day (1-day window)
  ratingChg:        number;
  priceChg:         number;  // percentage points
  rankUp:           number;  // positive = climbed (lower ordinal rank)
  scoreToday:       number;
  scoreChg:         number;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

function toRow(p: Product): SnapshotRow {
  return {
    source:       p.source ?? "rakuten",
    product_id:   p.id,
    product_key:  buildProductKey(p),
    market:       p.market,
    cat:          p.cat ?? null,
    name:         p.name ?? null,
    brand:        p.brand ?? null,
    price:        p.price ?? null,
    rating:       p.rating ?? null,
    review_count: p.rawReviewCount ?? null,
    score:        p.score ?? null,
    image_url:    p.imageUrl ?? null,
    item_url:     p.itemUrl ?? null,
  };
}

/**
 * Upsert a batch of products as today's snapshot.
 * Duplicate saves within the same calendar day are silently ignored
 * (ON CONFLICT DO NOTHING via the daily unique index).
 */
export async function saveProductSnapshots(products: Product[]): Promise<{
  saved: number;
  errors: string[];
}> {
  const db = getSupabase();
  if (!db) return { saved: 0, errors: ["Supabase not configured"] };

  const rows = products.map(toRow);
  const errors: string[] = [];
  let saved = 0;

  // Batch in groups of 100 to stay within Supabase payload limits.
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error, count } = await db
      .from("gadget_product_snapshots")
      .upsert(batch, {
        onConflict: "source,product_id,captured_date",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (error) {
      errors.push(error.message);
    } else {
      saved += count ?? batch.length;
    }
  }

  return { saved, errors };
}

// ---------------------------------------------------------------------------
// Fetch previous day's snapshots
// ---------------------------------------------------------------------------

/**
 * Returns the most-recent prior snapshot rows for the given product IDs
 * (Rakuten itemCodes — stable identifiers that never change for the same item),
 * excluding today.  Used by computeDeltas() to find "yesterday".
 *
 * Matching is intentionally by product_id, NOT product_key.
 * product_key is derived from the product name, which can vary between API
 * calls even for the same item (Rakuten often tweaks promotional suffixes).
 * product_id (the Rakuten itemCode e.g. "shop:item123") is always stable.
 */
export async function getPreviousSnapshots(
  productIds: string[],
  beforeDate: string  // ISO date string "YYYY-MM-DD"
): Promise<Map<string, SnapshotRow>> {
  if (productIds.length === 0) return new Map();

  const db = getSupabase();
  if (!db) return new Map();

  // Limit: we need at most one row per product (the most-recent before today).
  // Allow up to 30 prior days per product to handle gaps in cron execution.
  // Without an explicit limit, Supabase defaults to 1000 rows which can be
  // exhausted after ~5 days with 200 products.
  const rowLimit = Math.min(productIds.length * 30, 5000);

  const { data, error } = await db
    .from("gadget_product_snapshots")
    .select(
      "source,product_id,product_key,market,cat,name,brand,price,rating,review_count,score,image_url,item_url,captured_date"
    )
    .in("product_id", productIds)
    .lt("captured_date", beforeDate)
    .order("captured_date", { ascending: false })
    .limit(rowLimit);

  if (error || !data) return new Map();

  // Keep only the most-recent row per product_id (rows are date-DESC so first wins).
  const map = new Map<string, SnapshotRow>();
  for (const row of data) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, row as SnapshotRow);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Delta computation
// ---------------------------------------------------------------------------

/**
 * Momentum-based Trend Score.
 *
 * Primary axes:
 *   reviewsDelta  — market reaction (new reviews since yesterday)
 *   ratingChg     — direction of quality signal
 *
 * Secondary (trust / signal quality):
 *   rating        — trust bonus: high-rated products get a small lift
 *   rawReviewCount — low-signal penalty: very few reviews reduce confidence
 *
 * NOT a quality ranking — a product with reviewsDelta=0 and ratingChg=0
 * scores only the small trust bonus, even if its rating is 4.9.
 */
function computeMomentumScore(
  reviewsDelta:   number,
  ratingChg:      number,
  rating:         number,
  rawReviewCount: number,
): number {
  const reviewMomentum = Math.max(0, reviewsDelta) * 8;
  const ratingMomentum = Math.max(0, ratingChg) * 120;

  const trustBonus =
    rating >= 4.5 ? 8 :
    rating >= 4.2 ? 5 :
    rating >= 4.0 ? 2 : 0;

  const lowSignalPenalty =
    rawReviewCount < 3  ? -10 :
    rawReviewCount < 10 ? -5  : 0;

  return Math.max(0, Math.min(100, Math.round(
    reviewMomentum + ratingMomentum + trustBonus + lowSignalPenalty
  )));
}

/**
 * Fallback quality score (used when no prior snapshot exists).
 * Same formula as lib/rakuten.ts computeScore — kept in sync manually.
 * This is the "Baseline Score" shown in the UI until movement data arrives.
 */
function computeBaselineScore(rating: number, reviewCount: number): number {
  return Math.min(100, Math.round(rating * Math.log10(reviewCount + 10) * 12));
}

/**
 * Given today's live products and yesterday's snapshot map, produces a
 * merged list with delta fields populated.
 *
 * Two modes per product:
 *   isBaselineScore = true  → no prior snapshot; score = quality fallback.
 *                             UI shows "Baseline" instead of "Trend Score".
 *   isBaselineScore = false → prior snapshot found; score = momentum formula.
 *                             Δ-active products score significantly higher.
 */
export function computeDeltas(
  todayProducts: Product[],
  previousMap: Map<string, SnapshotRow>  // keyed by product_id
): Product[] {
  return todayProducts.map((p) => {
    // Look up by stable product_id (Rakuten itemCode), not by name-based key.
    const prev    = previousMap.get(p.id) ?? null;
    const hasPrev = prev !== null;

    const todayReviews    = p.rawReviewCount ?? 0;
    const prevReviews     = hasPrev ? (prev.review_count ?? todayReviews) : todayReviews;
    const reviewsDelta    = Math.max(0, todayReviews - prevReviews);
    const reviewsVelocity = reviewsDelta; // 1-day window

    const todayRating = p.rating ?? 0;
    const prevRating  = hasPrev ? (prev.rating ?? todayRating) : todayRating;
    const ratingChg   = parseFloat((todayRating - prevRating).toFixed(2));

    const todayPrice = p.price ?? 0;
    const prevPrice  = hasPrev ? (prev.price ?? todayPrice) : todayPrice;
    const priceChg   = prevPrice > 0
      ? parseFloat((((todayPrice - prevPrice) / prevPrice) * 100).toFixed(1))
      : 0;

    const rankUp = 0;

    // Score selection: momentum when prior data exists, baseline otherwise.
    const isBaselineScore = !hasPrev;
    const newScore = isBaselineScore
      ? computeBaselineScore(todayRating, todayReviews)
      : computeMomentumScore(reviewsDelta, ratingChg, todayRating, todayReviews);

    // scoreChg: meaningful only when both snapshots use the same formula.
    // Suppressed in the UI when isBaselineScore=true (no prior to compare to).
    const prevScore = prev?.score ?? newScore;
    const scoreChg  = parseFloat((newScore - prevScore).toFixed(1));

    return {
      ...p,
      score:           newScore,
      scoreChg,
      reviewsDelta,
      reviewsVelocity,
      ratingChg,
      priceChg,
      rankUp,
      isBaselineScore,
    };
  });
}

// ---------------------------------------------------------------------------
// Convenience: fetch + enrich in one call
// ---------------------------------------------------------------------------

/**
 * Given live products, loads yesterday's data from Supabase and returns
 * products with delta fields populated.  Safe to call even if Supabase is
 * unreachable — falls back to the original products.
 */
export async function enrichWithDeltas(
  products: Product[],
  todayDate: string  // "YYYY-MM-DD"
): Promise<Product[]> {
  try {
    const ids  = products.map((p) => p.id);
    const prev = await getPreviousSnapshots(ids, todayDate);
    return computeDeltas(products, prev);
  } catch {
    return products;
  }
}
