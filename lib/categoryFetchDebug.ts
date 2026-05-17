// Server-only: debug version of the category-sweep fetch.
// Calls searchRakuten(includeLowSignal:true) directly so every filtering stage
// is visible — no items are silently dropped before we can count them.
//
// Stage breakdown:
//   raw          → all items the Rakuten API returned
//   excluded_kw  → removed by keyword exclusion (ふるさと納税, 中古, etc.)
//   low_signal   → reviewCount < 3 OR rating === 0
//   quality      → rating < minRating OR reviewCount < minReviews (stricter gate)
//   dedupe       → duplicate itemCode across keyword calls
//   final        → what survives to the UI

import "server-only";

import { searchRakuten } from "./rakuten";
import type { RakutenProduct, ExcludedItem } from "./rakuten";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import { withConcurrency, withRetry, DEFAULT_MIN_REVIEW_COUNT, DEFAULT_MIN_RATING } from "./categoryFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallResult {
  marketId: string;
  keyword:  string;
  page:     number;
  status:   "success" | "failed";
  raw:      number;   // items from API (before any filtering)
  excKw:    number;   // excluded by keyword
  lowSig:   number;   // low-signal (reviewCount<3 or rating=0), from items list
  error?:   string;
  items:    RakutenProduct[];
  excluded: ExcludedItem[];
}

export interface MarketBreakdown {
  market:              string;
  calls:               number;
  failedCalls:         number;
  raw:                 number;
  excludedByKeyword:   number;
  lowSignal:           number;
  afterQualityFilter:  number;
  afterDedupe:         number;
}

export interface CategoryFetchDebugReport {
  minReviews:              number;
  minRating:               number;
  totalCategories:         number;
  totalRequests:           number;
  successfulRequests:      number;
  failedRequests:          number;
  failedSamples:           { marketId: string; keyword: string; page: number; error: string }[];
  rawItemsCount:           number;
  afterExcludeKeywordCount: number;
  afterLowSignalCount:     number;
  afterQualityFilterCount: number;
  afterDedupeCount:        number;
  finalCount:              number;
  marketBreakdown:         MarketBreakdown[];
  dropReasons: {
    excluded_keyword:  number;
    low_signal:        number;
    low_rating:        number;
    low_review_count:  number;
    low_both:          number;
    api_error:         number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLowSignal(p: RakutenProduct): boolean {
  return p.rawReviewCount < 3 || p.rating === 0;
}

// ─── Debug fetch ─────────────────────────────────────────────────────────────

export async function fetchByCategoriesDebug(options: {
  minReviews?:   number;
  minRating?:    number;
  marketFilter?: string;
}): Promise<CategoryFetchDebugReport> {
  const minReviews   = options.minReviews   ?? DEFAULT_MIN_REVIEW_COUNT;
  const minRating    = options.minRating    ?? DEFAULT_MIN_RATING;
  const marketFilter = options.marketFilter && options.marketFilter !== "all"
    ? options.marketFilter
    : undefined;

  const markets = marketFilter
    ? MARKET_CATEGORIES.filter((m) => m.marketId === marketFilter)
    : MARKET_CATEGORIES;

  // Build call list
  const callDefs: { marketId: string; keyword: string; cat: string; page: number }[] = [];
  for (const market of markets) {
    for (const entry of market.categories) {
      const pages = Math.min(entry.pages ?? 1, 3);
      for (let page = 1; page <= pages; page++) {
        callDefs.push({ marketId: market.marketId, keyword: entry.keyword, cat: entry.cat, page });
      }
    }
  }

  // Run with concurrency=3, 300ms delay, 1 retry — same as production
  const tasks = callDefs.map(({ marketId, keyword, cat, page }) => async (): Promise<CallResult> => {
    try {
      const result = await withRetry(() =>
        searchRakuten({
          keyword,
          market:          marketId,
          cat,
          hits:            30,
          page,
          includeLowSignal: true, // get everything before low-signal filter
        })
      );

      // Count low-signal items that came through (because includeLowSignal=true)
      const lowSig = result.items.filter(isLowSignal).length;

      return {
        marketId,
        keyword,
        page,
        status:   "success",
        raw:      result.items.length + result.excludedItems.length,
        excKw:    result.excludedItems.length,
        lowSig,
        items:    result.items,
        excluded: result.excludedItems,
      };
    } catch (err) {
      return {
        marketId,
        keyword,
        page,
        status:   "failed",
        raw:      0,
        excKw:    0,
        lowSig:   0,
        error:    err instanceof Error ? err.message : String(err),
        items:    [],
        excluded: [],
      };
    }
  });

  const settled = await withConcurrency(tasks, 3, 300);
  const callResults: CallResult[] = settled.map((r) =>
    r.status === "fulfilled" ? r.value : {
      marketId: "", keyword: "", page: 0, status: "failed" as const,
      raw: 0, excKw: 0, lowSig: 0, error: "Internal concurrency error",
      items: [], excluded: [],
    }
  );

  // ─── Aggregate ────────────────────────────────────────────────────────────

  const successCalls = callResults.filter((c) => c.status === "success");
  const failedCalls  = callResults.filter((c) => c.status === "failed");

  const rawTotal    = callResults.reduce((s, c) => s + c.raw, 0);
  const excKwTotal  = callResults.reduce((s, c) => s + c.excKw, 0);

  // Pool all items across calls (still includes low-signal at this stage)
  const allItems = successCalls.flatMap((c) => c.items);
  const afterExcludeKeyword = allItems.length;

  // After low-signal filter
  const afterLowSignal = allItems.filter((p) => !isLowSignal(p));

  // After quality filter
  const afterQuality = afterLowSignal.filter(
    (p) => p.rating >= minRating && p.rawReviewCount >= minReviews
  );

  // After dedupe
  const seen = new Set<string>();
  const afterDedupe: RakutenProduct[] = [];
  for (const p of afterQuality) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      afterDedupe.push(p);
    }
  }

  // Drop reason breakdown (relative to raw non-keyword-excluded pool)
  const lowRatingOnly   = afterLowSignal.filter((p) => p.rating < minRating && p.rawReviewCount >= minReviews).length;
  const lowReviewOnly   = afterLowSignal.filter((p) => p.rawReviewCount < minReviews && p.rating >= minRating).length;
  const lowBoth         = afterLowSignal.filter((p) => p.rating < minRating && p.rawReviewCount < minReviews).length;
  const lowSigTotal     = allItems.filter(isLowSignal).length;

  // Market-level breakdown
  const marketIds = [...new Set(callDefs.map((c) => c.marketId))];
  const marketBreakdown: MarketBreakdown[] = marketIds.map((mid) => {
    const mCalls    = callResults.filter((c) => c.marketId === mid);
    const mItems    = mCalls.flatMap((c) => c.items);
    const mExcKw    = mCalls.reduce((s, c) => s + c.excKw, 0);
    const mLowSig   = mItems.filter(isLowSignal);
    const mQuality  = mItems.filter((p) => !isLowSignal(p) && p.rating >= minRating && p.rawReviewCount >= minReviews);

    // Dedupe within market
    const mSeen = new Set<string>();
    const mFinal: RakutenProduct[] = [];
    for (const p of mQuality) {
      if (!mSeen.has(p.id)) { mSeen.add(p.id); mFinal.push(p); }
    }

    return {
      market:             mid,
      calls:              mCalls.length,
      failedCalls:        mCalls.filter((c) => c.status === "failed").length,
      raw:                mCalls.reduce((s, c) => s + c.raw, 0),
      excludedByKeyword:  mExcKw,
      lowSignal:          mLowSig.length,
      afterQualityFilter: mQuality.length,
      afterDedupe:        mFinal.length,
    };
  });

  const failedSamples = failedCalls
    .slice(0, 5)
    .map((c) => ({ marketId: c.marketId, keyword: c.keyword, page: c.page, error: c.error ?? "" }));

  return {
    minReviews,
    minRating,
    totalCategories:          callDefs.length,
    totalRequests:            callResults.length,
    successfulRequests:       successCalls.length,
    failedRequests:           failedCalls.length,
    failedSamples,
    rawItemsCount:            rawTotal,
    afterExcludeKeywordCount: afterExcludeKeyword,
    afterLowSignalCount:      afterLowSignal.length,
    afterQualityFilterCount:  afterQuality.length,
    afterDedupeCount:         afterDedupe.length,
    finalCount:               afterDedupe.length,
    marketBreakdown,
    dropReasons: {
      excluded_keyword: excKwTotal,
      low_signal:       lowSigTotal,
      low_rating:       lowRatingOnly,
      low_review_count: lowReviewOnly,
      low_both:         lowBoth,
      api_error:        failedCalls.length,
    },
  };
}
