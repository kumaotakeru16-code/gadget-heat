// Server-only: category-sweep product fetcher.
// Returns products + FetchStats so the UI and Hero can show real numbers.

import "server-only";

import { sourceForLocale } from "./sources";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

export const DEFAULT_MIN_REVIEW_COUNT = 3;
export const DEFAULT_MIN_RATING       = 3.8;
const MAX_PRODUCTS                    = 300;
const CONCURRENCY                     = 2;    // keep within Rakuten rate limit
const INTER_REQUEST_DELAY_MS          = 700;  // ms between requests per worker
const RETRY_DELAY_MS                  = 2000; // wait on 429/502/503 before retry

// ─── Shared types ─────────────────────────────────────────────────────────────

/**
 * Pipeline statistics returned alongside products.
 * Covers every filtering stage so UI and debug API can show consistent numbers.
 */
export interface FetchStats {
  rawItemsCount:           number; // items from API before quality filter (after Rakuten's own keyword+low-signal filters)
  afterQualityFilterCount: number; // items passing minRating + minReviewCount (before cross-keyword dedupe)
  afterDedupeCount:        number; // = finalCount
  finalCount:              number; // products.length after sort+slice
  successfulRequests:      number;
  failedRequests:          number;
  averageRating:           number; // mean rating across final products
  totalReviewCount:        number; // sum of rawReviewCount across final products
  totalReviewsDelta:       number; // sum of reviewsDelta (0 until snapshot deltas are enriched)
}

export interface CategoryFetchResult {
  products: Product[];
  stats:    FetchStats;
}

// ─── Concurrency helpers ──────────────────────────────────────────────────────

/**
 * Worker-pool concurrency limiter.
 * `limit` workers pick tasks from a shared queue; each waits `delayMs` between tasks.
 * Returns results in the same order as `tasks`.
 */
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

/**
 * Retries `fn` once on HTTP 429 / 502 / 503 after `retryDelayMs`.
 */
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

// ─── Fetch ────────────────────────────────────────────────────────────────────

export interface CategoryFetchOptions {
  minReviewCount?: number;
  minRating?:      number;
}

/**
 * Fetches products across all markets defined in MARKET_CATEGORIES.
 * Returns products (sorted, deduped, capped) and pipeline stats.
 */
export async function fetchByCategories(
  locale: LocaleCode = "jp",
  opts: CategoryFetchOptions = {},
): Promise<CategoryFetchResult> {
  const minReviewCount = opts.minReviewCount ?? DEFAULT_MIN_REVIEW_COUNT;
  const minRating      = opts.minRating      ?? DEFAULT_MIN_RATING;

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

  let rawItemsCount           = 0;
  let afterQualityFilterCount = 0;
  let successfulRequests      = 0;
  let failedRequests          = 0;

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
      const passesQuality =
        (p.rawReviewCount ?? 0) >= minReviewCount && p.rating >= minRating;
      if (passesQuality) afterQualityFilterCount++;
      if (!passesQuality || seen.has(p.id)) continue;
      seen.add(p.id);
      products.push(p);
    }
  }

  const sorted = products.sort((a, b) => b.score - a.score).slice(0, MAX_PRODUCTS);

  const averageRating =
    sorted.length > 0
      ? sorted.reduce((s, p) => s + p.rating, 0) / sorted.length
      : 0;
  const totalReviewCount  = sorted.reduce((s, p) => s + (p.rawReviewCount ?? 0), 0);
  const totalReviewsDelta = sorted.reduce((s, p) => s + (p.reviewsDelta ?? 0), 0);

  const stats: FetchStats = {
    rawItemsCount,
    afterQualityFilterCount,
    afterDedupeCount:  sorted.length,
    finalCount:        sorted.length,
    successfulRequests,
    failedRequests,
    averageRating:     Math.round(averageRating * 100) / 100,
    totalReviewCount,
    totalReviewsDelta,
  };

  return { products: sorted, stats };
}
