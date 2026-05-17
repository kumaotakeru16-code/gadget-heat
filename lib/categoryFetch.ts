// Server-only: category-sweep product fetcher.
// Returns products + FetchStats so the UI and Hero can show real numbers.

import "server-only";

import { sourceForLocale } from "./sources";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

// Soft-penalty onset thresholds — exported for debug module reference.
// These are NOT hard gates: items below them are kept with a reduced score.
export const DEFAULT_MIN_REVIEW_COUNT = 3;
export const DEFAULT_MIN_RATING       = 3.8;

const MAX_PRODUCTS           = 300;
const CONCURRENCY            = 2;   // keep within Rakuten rate limit
const INTER_REQUEST_DELAY_MS = 700;
const RETRY_DELAY_MS         = 2000;

// Diversity parameters — prevent any single market or category from dominating.
const DIVERSITY_MAX_PER_CAT    = 3;   // max per (market:cat) pair inside the lead zone
const DIVERSITY_MAX_PER_MARKET = 12;  // max per market inside the lead zone
const DIVERSITY_LEAD_SIZE      = 200; // products covered by diversity cap (score-sorted)

// ─── Shared types ──────────────────────────────────────────────────────────────

/**
 * Pipeline statistics returned alongside products.
 * Every filtering stage is tracked so the UI and debug API show consistent numbers.
 */
export interface FetchStats {
  rawItemsCount:           number; // from source before any in-app filtering
  removedByHardExclude:    number; // reviewCount=0 or rating=0 — no usable signal
  penalizedLowSignal:      number; // kept but score-reduced (low reviews or low rating)
  afterQualityFilterCount: number; // compat alias: rawItemsCount - removedByHardExclude
  afterDedupeCount:        number; // unique items before diversity reranking
  diversityCollapsed:      number; // items shifted back by diversity cap (not discarded)
  diversityAdjustedCount:  number; // = finalCount, for debug clarity
  finalCount:              number;
  successfulRequests:      number;
  failedRequests:          number;
  averageRating:           number;
  totalReviewCount:        number;
  totalReviewsDelta:       number;
}

export interface CategoryFetchResult {
  products: Product[];
  stats:    FetchStats;
}

// ─── Concurrency helpers ───────────────────────────────────────────────────────

export async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  delayMs: number,
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
      if (delayMs > 0 && next < tasks.length) {
        await new Promise<void>((r) => setTimeout(r, delayMs));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  retryDelayMs = RETRY_DELAY_MS,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      const msg = (err instanceof Error ? err.message : "") ?? "";
      const isRetryable =
        msg.includes(" 429 ") ||
        msg.includes(" 502 ") ||
        msg.includes(" 503 ");
      if (isRetryable) {
        await new Promise<void>((r) => setTimeout(r, retryDelayMs));
        return withRetry(fn, retries - 1, retryDelayMs);
      }
    }
    throw err;
  }
}

// ─── Signal quality helpers ────────────────────────────────────────────────────

// Zero-data items: no reviewCount or no rating means we have nothing to score.
function isHardExclude(p: Product): boolean {
  return (p.rawReviewCount ?? 0) === 0 || p.rating === 0;
}

// Multiplicative penalty for items below quality thresholds.
// Compounds across both axes so genuinely weak items sink without being dropped.
function softPenaltyFactor(p: Product): number {
  let m = 1.0;
  const rc = p.rawReviewCount ?? 0;
  const r  = p.rating;

  if      (rc <  3) m *= 0.55;
  else if (rc <  8) m *= 0.80;
  else if (rc < 15) m *= 0.92;

  if      (r < 3.0) m *= 0.40;
  else if (r < 3.5) m *= 0.65;
  else if (r < 3.8) m *= 0.82;

  return m;
}

// ─── Diversity reranking ───────────────────────────────────────────────────────

/**
 * Prevents the same market or category from flooding the top positions.
 * Items that exceed the cap are deferred immediately after the lead zone —
 * they are still in the pool and still visible, just not consecutive.
 */
export function applyDiversity<T extends { market: string; cat: string }>(
  sorted: T[],
  opts: { maxPerCat?: number; maxPerMarket?: number; leadSize?: number } = {},
): { result: T[]; collapsedCount: number } {
  const {
    maxPerCat    = DIVERSITY_MAX_PER_CAT,
    maxPerMarket = DIVERSITY_MAX_PER_MARKET,
    leadSize     = DIVERSITY_LEAD_SIZE,
  } = opts;

  const catCounts = new Map<string, number>();
  const mktCounts = new Map<string, number>();
  const lead:     T[] = [];
  const deferred: T[] = [];
  let collapsedCount = 0;

  for (const p of sorted.slice(0, leadSize)) {
    const ck = `${p.market}:${p.cat}`;
    const cc = catCounts.get(ck)       ?? 0;
    const mc = mktCounts.get(p.market) ?? 0;

    if (cc < maxPerCat && mc < maxPerMarket) {
      catCounts.set(ck,       cc + 1);
      mktCounts.set(p.market, mc + 1);
      lead.push(p);
    } else {
      deferred.push(p);
      collapsedCount++;
    }
  }

  return {
    result: [...lead, ...deferred, ...sorted.slice(leadSize)],
    collapsedCount,
  };
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

export interface CategoryFetchOptions {
  // Kept for API compat; production pipeline uses fixed soft-penalty thresholds.
  minReviewCount?: number;
  minRating?:      number;
}

/**
 * Fetches products across all markets defined in MARKET_CATEGORIES.
 * Returns a diversity-reranked, soft-penalty-scored pool + pipeline stats.
 */
export async function fetchByCategories(
  locale: LocaleCode = "jp",
  _opts: CategoryFetchOptions = {},
): Promise<CategoryFetchResult> {
  const source = sourceForLocale(locale);

  const calls: { marketId: string; keyword: string; cat: string; page: number }[] = [];
  for (const market of MARKET_CATEGORIES) {
    for (const entry of market.categories) {
      const pages = Math.min(entry.pages ?? 1, 3);
      for (let page = 1; page <= pages; page++) {
        calls.push({ marketId: market.marketId, keyword: entry.keyword, cat: entry.cat, page });
      }
    }
  }

  const tasks = calls.map(({ marketId, keyword, cat, page }) => () =>
    withRetry(() =>
      source.searchProducts({ keyword, market: marketId, cat, hits: 30, page })
    )
  );

  const results = await withConcurrency(tasks, CONCURRENCY, INTER_REQUEST_DELAY_MS);

  let rawItemsCount        = 0;
  let removedByHardExclude = 0;
  let penalizedLowSignal   = 0;
  let successfulRequests   = 0;
  let failedRequests       = 0;

  const seen     = new Set<string>();
  const products: Product[] = [];

  for (const result of results) {
    if (result.status === "rejected") {
      failedRequests++;
      continue;
    }
    successfulRequests++;

    for (const p of result.value) {
      rawItemsCount++;

      if (isHardExclude(p)) {
        removedByHardExclude++;
        continue;
      }

      if (seen.has(p.id)) continue;
      seen.add(p.id);

      const penalty = softPenaltyFactor(p);
      if (penalty < 1.0) {
        penalizedLowSignal++;
        products.push({ ...p, score: Math.round(p.score * penalty) });
      } else {
        products.push(p);
      }
    }
  }

  const sorted = [...products].sort((a, b) => b.score - a.score);

  const { result: diversified, collapsedCount } = applyDiversity(sorted);
  const final = diversified.slice(0, MAX_PRODUCTS);

  const averageRating = final.length > 0
    ? final.reduce((s, p) => s + p.rating, 0) / final.length
    : 0;
  const totalReviewCount  = final.reduce((s, p) => s + (p.rawReviewCount ?? 0), 0);
  const totalReviewsDelta = final.reduce((s, p) => s + (p.reviewsDelta    ?? 0), 0);

  const stats: FetchStats = {
    rawItemsCount,
    removedByHardExclude,
    penalizedLowSignal,
    afterQualityFilterCount: rawItemsCount - removedByHardExclude,
    afterDedupeCount:        sorted.length,
    diversityCollapsed:      collapsedCount,
    diversityAdjustedCount:  final.length,
    finalCount:              final.length,
    successfulRequests,
    failedRequests,
    averageRating:           Math.round(averageRating * 100) / 100,
    totalReviewCount,
    totalReviewsDelta,
  };

  return { products: final, stats };
}
