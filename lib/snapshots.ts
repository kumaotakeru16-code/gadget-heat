// Server-only: snapshot persistence and delta computation for Gadget Heat
// trend scoring.  Never import from client components.
//
// Flow:
//   1. Admin cron calls saveProductSnapshots() with live Rakuten data.
//   2. computeDeltas() joins today vs. yesterday rows to produce scoreChg,
//      reviewsDelta, reviewsVelocity, rankUp and a fresh trend score.
//   3. fetchTopMovers() (already implemented) uses the enriched Product list.

import { supabase } from "./supabase";
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
  const rows = products.map(toRow);
  const errors: string[] = [];
  let saved = 0;

  // Batch in groups of 100 to stay within Supabase payload limits.
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error, count } = await supabase
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
 * Returns the most-recent prior snapshot rows for the given product keys,
 * excluding today.  Used by computeDeltas() to find "yesterday".
 */
export async function getPreviousSnapshots(
  productKeys: string[],
  beforeDate: string  // ISO date string "YYYY-MM-DD"
): Promise<Map<string, SnapshotRow>> {
  if (productKeys.length === 0) return new Map();

  const { data, error } = await supabase
    .from("gadget_product_snapshots")
    .select(
      "source,product_id,product_key,market,cat,name,brand,price,rating,review_count,score,image_url,item_url,captured_date"
    )
    .in("product_key", productKeys)
    .lt("captured_date", beforeDate)
    .order("captured_date", { ascending: false });

  if (error || !data) return new Map();

  // Keep only the most-recent row per product_key.
  const map = new Map<string, SnapshotRow>();
  for (const row of data) {
    if (!map.has(row.product_key)) {
      map.set(row.product_key, row as SnapshotRow);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Delta computation
// ---------------------------------------------------------------------------

/**
 * Trend Score formula:
 *   score = reviewsDelta * 2 + rating * 10 + (rankUp > 0 ? rankUp * 0.5 : 0)
 *
 * This is intentionally simple — reviewsDelta is the primary signal.
 * Rating acts as a quality floor.  Rank movement adds momentum.
 */
function computeScore(
  reviewsDelta: number,
  rating: number,
  rankUp: number
): number {
  return Math.round(
    reviewsDelta * 2 + rating * 10 + (rankUp > 0 ? rankUp * 0.5 : 0)
  );
}

/**
 * Given today's live products and yesterday's snapshot map, produces a
 * merged list with delta fields populated.  Products with no prior snapshot
 * get zero deltas.
 */
export function computeDeltas(
  todayProducts: Product[],
  previousMap: Map<string, SnapshotRow>
): Product[] {
  return todayProducts.map((p, idx) => {
    const key  = buildProductKey(p);
    const prev = previousMap.get(key) ?? null;

    const todayReviews    = p.rawReviewCount ?? 0;
    const prevReviews     = prev?.review_count ?? todayReviews;
    const reviewsDelta    = Math.max(0, todayReviews - prevReviews);
    const reviewsVelocity = reviewsDelta; // 1-day window → delta = velocity

    const todayRating = p.rating ?? 0;
    const prevRating  = prev?.rating ?? todayRating;
    const ratingChg   = parseFloat((todayRating - prevRating).toFixed(2));

    const todayPrice = p.price ?? 0;
    const prevPrice  = prev?.price ?? todayPrice;
    const priceChg   = prevPrice > 0
      ? parseFloat((((todayPrice - prevPrice) / prevPrice) * 100).toFixed(1))
      : 0;

    // Rank is ordinal position in todayProducts (0-based), lower = better.
    // We don't know previous rank without more state, so we default to 0.
    const rankUp = 0; // populated later once we have prev-day ranking

    const newScore = computeScore(reviewsDelta, todayRating, rankUp);

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
    const keys = products.map(buildProductKey);
    const prev = await getPreviousSnapshots(keys, todayDate);
    return computeDeltas(products, prev);
  } catch {
    return products;
  }
}
