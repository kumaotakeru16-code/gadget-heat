// Server-only: debug version of the category-sweep fetch.
// Mirrors the production pipeline (soft penalty + diversity) so every stage
// is visible and counts match what the UI actually receives.
//
// Stage breakdown:
//   raw            → all items the Rakuten API returned (keyword exclusions inside Rakuten)
//   hard_exclude   → reviewCount=0 or rating=0 (no usable signal)
//   penalized      → kept but score reduced (low reviews / low rating)
//   dedupe         → duplicate itemCode across keyword calls
//   diversity      → items shifted back by per-cat / per-market cap
//   final          → what survives to the UI

import "server-only";

import { searchRakuten } from "./rakuten";
import type { RakutenProduct, ExcludedItem } from "./rakuten";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import {
  withConcurrency,
  withRetry,
  applyDiversity,
  DEFAULT_MIN_REVIEW_COUNT,
  DEFAULT_MIN_RATING,
} from "./categoryFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallResult {
  marketId: string;
  keyword:  string;
  page:     number;
  status:   "success" | "failed";
  raw:      number;
  excKw:    number;
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
  hardExcluded:        number;
  penalizedLowSignal:  number;
  afterQualityFilter:  number; // compat alias: raw - excludedByKeyword - hardExcluded
  afterDedupe:         number;
  diversityCollapsed:  number;
}

export interface CategoryFetchDebugReport {
  // Config reference values (no longer used as hard gates in production)
  minReviews:               number;
  minRating:                number;

  // Request stats
  totalCategories:          number;
  totalRequests:            number;
  successfulRequests:       number;
  failedRequests:           number;
  failedSamples:            { marketId: string; keyword: string; page: number; error: string }[];

  // Pipeline stages
  rawItemsCount:            number;
  afterExcludeKeywordCount: number;
  removedByHardExclude:     number; // reviewCount=0 or rating=0
  penalizedLowSignal:       number; // kept with score reduction
  afterLowSignalCount:      number; // compat: afterExcludeKeywordCount - removedByHardExclude
  afterQualityFilterCount:  number; // compat alias for afterLowSignalCount
  afterDedupeCount:         number;
  diversityCollapsed:       number;
  diversityAdjustedCount:   number;
  finalCount:               number;

  marketBreakdown: MarketBreakdown[];

  dropReasons: {
    excluded_keyword: number;
    hard_exclude:     number; // replaces low_signal; reviewCount=0 or rating=0
    low_signal:       number; // compat alias for hard_exclude
    penalized:        number;
    api_error:        number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHardExclude(p: RakutenProduct): boolean {
  return p.rawReviewCount === 0 || p.rating === 0;
}

function softPenaltyFactor(p: RakutenProduct): number {
  let m = 1.0;
  const rc = p.rawReviewCount;
  const r  = p.rating;

  if      (rc <  3) m *= 0.55;
  else if (rc <  8) m *= 0.80;
  else if (rc < 15) m *= 0.92;

  if      (r < 3.0) m *= 0.40;
  else if (r < 3.5) m *= 0.65;
  else if (r < 3.8) m *= 0.82;

  return m;
}

// ─── Debug fetch ──────────────────────────────────────────────────────────────

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

  const callDefs: { marketId: string; keyword: string; cat: string; page: number }[] = [];
  for (const market of markets) {
    for (const entry of market.categories) {
      const pages = Math.min(entry.pages ?? 1, 3);
      for (let page = 1; page <= pages; page++) {
        callDefs.push({ marketId: market.marketId, keyword: entry.keyword, cat: entry.cat, page });
      }
    }
  }

  const tasks = callDefs.map(({ marketId, keyword, cat, page }) => async (): Promise<CallResult> => {
    try {
      const result = await withRetry(() =>
        searchRakuten({
          keyword,
          market:           marketId,
          cat,
          hits:             30,
          page,
          includeLowSignal: true, // see every item before any app-level filtering
        })
      );

      return {
        marketId,
        keyword,
        page,
        status:   "success",
        raw:      result.items.length + result.excludedItems.length,
        excKw:    result.excludedItems.length,
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
        error:    err instanceof Error ? err.message : String(err),
        items:    [],
        excluded: [],
      };
    }
  });

  const settled = await withConcurrency(tasks, 2, 700);
  const callResults: CallResult[] = settled.map((r) =>
    r.status === "fulfilled" ? r.value : {
      marketId: "", keyword: "", page: 0, status: "failed" as const,
      raw: 0, excKw: 0, error: "Internal concurrency error",
      items: [], excluded: [],
    }
  );

  // ─── Aggregate ────────────────────────────────────────────────────────────

  const successCalls = callResults.filter((c) => c.status === "success");
  const failedCalls  = callResults.filter((c) => c.status === "failed");

  const rawTotal   = callResults.reduce((s, c) => s + c.raw,   0);
  const excKwTotal = callResults.reduce((s, c) => s + c.excKw, 0);

  // All items after keyword exclusion (low-signal still present)
  const allItems = successCalls.flatMap((c) => c.items);

  // Stage: hard exclude
  let removedByHardExclude = 0;
  let penalizedCount       = 0;
  const afterHardExclude   = allItems.filter((p) => {
    if (isHardExclude(p)) { removedByHardExclude++; return false; }
    return true;
  });

  // Stage: soft penalty (count items that receive any penalty)
  afterHardExclude.forEach((p) => {
    if (softPenaltyFactor(p) < 1.0) penalizedCount++;
  });

  // Stage: dedupe (cross-keyword, applying soft penalty to score)
  const seen        = new Set<string>();
  const afterDedupe: RakutenProduct[] = [];
  for (const p of afterHardExclude) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      const penalty = softPenaltyFactor(p);
      afterDedupe.push(penalty < 1.0 ? { ...p, score: Math.round(p.score * penalty) } : p);
    }
  }

  // Stage: sort + diversity
  const sorted = [...afterDedupe].sort((a, b) => b.score - a.score);
  const { result: diversified, collapsedCount } = applyDiversity(sorted);
  const final = diversified.slice(0, 300);

  // ─── Market-level breakdown ───────────────────────────────────────────────

  const marketIds = [...new Set(callDefs.map((c) => c.marketId))];
  const marketBreakdown: MarketBreakdown[] = marketIds.map((mid) => {
    const mCalls = callResults.filter((c) => c.marketId === mid);
    const mItems = mCalls.flatMap((c) => c.items);
    const mExcKw = mCalls.reduce((s, c) => s + c.excKw, 0);

    let mHardExcluded = 0;
    let mPenalized    = 0;
    const mAfterHard  = mItems.filter((p) => {
      if (isHardExclude(p)) { mHardExcluded++; return false; }
      return true;
    });
    mAfterHard.forEach((p) => { if (softPenaltyFactor(p) < 1.0) mPenalized++; });

    // Dedupe within market for breakdown count
    const mSeen  = new Set<string>();
    const mDedup: RakutenProduct[] = [];
    for (const p of mAfterHard) {
      if (!mSeen.has(p.id)) { mSeen.add(p.id); mDedup.push(p); }
    }

    // Diversity collapsed within market (approximate — global diversity is cross-market)
    const mDivResult = applyDiversity(
      [...mDedup].sort((a, b) => b.score - a.score),
      { maxPerCat: 4, maxPerMarket: 20, leadSize: 200 },
    );

    return {
      market:             mid,
      calls:              mCalls.length,
      failedCalls:        mCalls.filter((c) => c.status === "failed").length,
      raw:                mCalls.reduce((s, c) => s + c.raw, 0),
      excludedByKeyword:  mExcKw,
      hardExcluded:       mHardExcluded,
      penalizedLowSignal: mPenalized,
      afterQualityFilter: mAfterHard.length,
      afterDedupe:        mDedup.length,
      diversityCollapsed: mDivResult.collapsedCount,
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
    afterExcludeKeywordCount: allItems.length,
    removedByHardExclude,
    penalizedLowSignal:       penalizedCount,
    afterLowSignalCount:      afterHardExclude.length,
    afterQualityFilterCount:  afterHardExclude.length,
    afterDedupeCount:         afterDedupe.length,
    diversityCollapsed:       collapsedCount,
    diversityAdjustedCount:   final.length,
    finalCount:               final.length,
    marketBreakdown,
    dropReasons: {
      excluded_keyword: excKwTotal,
      hard_exclude:     removedByHardExclude,
      low_signal:       removedByHardExclude, // compat alias
      penalized:        penalizedCount,
      api_error:        failedCalls.length,
    },
  };
}
