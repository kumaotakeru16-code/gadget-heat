// Server-only: category-sweep product fetcher.
// Replaces the old seed-only approach with per-market keyword expansion
// and multi-page fetching, yielding 100-300 quality-filtered products.
//
// Quality thresholds (configurable, tighter than the low-signal filter in rakuten.ts):
//   minReviewCount = 3   (vs 3 in isLowSignal — same floor, explicit)
//   minRating      = 3.8 (vs 0 in isLowSignal — meaningful quality gate)

import "server-only";

import { sourceForLocale } from "./sources";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import type { Product } from "@/data/products";
import type { LocaleCode } from "@/data/locales";

export const DEFAULT_MIN_REVIEW_COUNT = 3;
export const DEFAULT_MIN_RATING       = 3.8;
const MAX_PRODUCTS                    = 300;
const CONCURRENCY                     = 3;   // simultaneous Rakuten requests
const INTER_REQUEST_DELAY_MS          = 300; // ms between requests per worker
const RETRY_DELAY_MS                  = 1200;

// ─── Concurrency helpers ──────────────────────────────────────────────────────

/**
 * Worker-pool style concurrency limiter.
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
 * Each market's keywords are swept with bounded concurrency.
 * Products are deduped by ID, quality-filtered, scored, and capped at MAX_PRODUCTS.
 */
export async function fetchByCategories(
  locale: LocaleCode = "jp",
  opts: CategoryFetchOptions = {},
): Promise<Product[]> {
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

  const seen     = new Set<string>();
  const products: Product[] = [];

  for (const result of results) {
    if (result.status === "rejected") continue;
    for (const p of result.value) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if ((p.rawReviewCount ?? 0) < minReviewCount) continue;
      if (p.rating < minRating) continue;
      products.push(p);
    }
  }

  return products
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PRODUCTS);
}
