// Lightweight homepage fetch — 12 Rakuten API calls instead of 130+.
//
// Build timeout root cause:
//   fetchByCategories makes 132 API calls with CONCURRENCY=2, DELAY=700ms.
//   Even if every call fails instantly, 132/2 × 700ms = 46 seconds in delays alone,
//   pushing the build past Vercel's 60-second prerender limit.
//
// This module uses:
//   - 12 representative keywords (top 2 per market)
//   - CONCURRENCY=4, DELAY=250ms  → 3 waves × ~1.25s = ~4 seconds total
//   - Per-request 8-second AbortSignal timeout
//   - Hard cap of HOMEPAGE_PRODUCT_LIMIT results
//
// Full sweep (fetchTopMovers / fetchByCategories) is kept for:
//   - /admin/social (admin-only, no build timeout concern)
//   - Cron jobs (background, no UI blocking)
//
// Production note: switching page.tsx to `export const revalidate = 600`
// (ISR) is better for traffic — fetches are served from cache and revalidated
// in background. The current `force-dynamic` is the conservative build-fix.

import "server-only";

import { rakutenSource } from "@/lib/sources";
import { withConcurrency, applyDiversity } from "@/lib/categoryFetch";
import { enrichWithDeltas } from "@/lib/snapshots";
import type { Product } from "@/data/products";
import type { FetchStats } from "@/lib/categoryFetch";

// ── Lite keyword set — 2 highest-signal entries per active market ──────────────
// Chosen to cover distinct heat signals across markets without redundancy.
// Update when market priorities change; full MARKET_CATEGORIES drives admin/cron.

const LITE_ENTRIES = [
  { marketId: "beauty",   cat: "Hair Dryer",      keyword: "ドライヤー 大風量 速乾 プロ仕様" },
  { marketId: "beauty",   cat: "Face Care",       keyword: "美顔器 RF EMS 高周波 リフトアップ" },
  { marketId: "kitchen",  cat: "Air Fryer",       keyword: "ノンフライヤー 電気フライヤー 揚げ物 油不使用" },
  { marketId: "kitchen",  cat: "Coffee Maker",    keyword: "全自動コーヒーメーカー 豆から 挽きたて 本体" },
  { marketId: "cleaning", cat: "Robot Vacuum",    keyword: "ロボット掃除機 マッピング 水拭き 自動充電 段差" },
  { marketId: "cleaning", cat: "Air Purifier",    keyword: "空気清浄機 HEPA 花粉 PM2.5 脱臭 フィルター" },
  { marketId: "outdoor",  cat: "Portable Power",  keyword: "ポータブル電源 大容量 キャンプ 防災 停電" },
  { marketId: "outdoor",  cat: "Emergency Radio", keyword: "防災ラジオ 手回し充電 AM FM 多機能 停電" },
  { marketId: "daily",    cat: "Storage",         keyword: "収納 便利グッズ 省スペース 整理 引き出し" },
  { marketId: "daily",    cat: "Disaster Goods",  keyword: "防災 グッズ 非常用 備え 必需品" },
  { marketId: "health",   cat: "Massage Gun",     keyword: "マッサージガン 筋肉 電動 ハンドガン 振動" },
  { marketId: "health",   cat: "Smart Scale",     keyword: "体重計 体脂肪 体組成計 スマート Bluetooth" },
] as const;

const LITE_CONCURRENCY      = 4;
const LITE_DELAY_MS         = 250;
const REQUEST_TIMEOUT_MS    = 8_000;

export const HOMEPAGE_PRODUCT_LIMIT = 10;

// ── Scoring helpers (mirrors categoryFetch internals, not re-exported there) ───

function isHardExclude(p: Product): boolean {
  return (p.rawReviewCount ?? 0) === 0 || p.rating === 0;
}

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

// Race a promise against a hard timeout so a single slow Rakuten call
// cannot block the entire homepage render.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`lite-fetch timeout ${ms}ms`)), ms)
    ),
  ]);
}

// ── Public types ───────────────────────────────────────────────────────────────

export interface TopMoversLiteResult {
  products: Product[];
  stats:    FetchStats;
}

// ── Main fetch ─────────────────────────────────────────────────────────────────

export async function fetchTopMoversLite(): Promise<TopMoversLiteResult | null> {
  try {
    // 12 tasks, CONCURRENCY=4 → 3 waves of 4, with 250ms between waves
    const tasks = LITE_ENTRIES.map(({ marketId, cat, keyword }) => () =>
      withTimeout(
        rakutenSource.searchProducts({ keyword, market: marketId, cat, hits: 30 }),
        REQUEST_TIMEOUT_MS,
      )
    );

    const settled = await withConcurrency(tasks, LITE_CONCURRENCY, LITE_DELAY_MS);

    // ── Aggregate and score ──────────────────────────────────────────────────
    let rawItemsCount        = 0;
    let removedByHardExclude = 0;
    let penalizedLowSignal   = 0;
    let successfulRequests   = 0;
    let failedRequests       = 0;

    const seen     = new Set<string>();
    const products: Product[] = [];

    for (const r of settled) {
      if (r.status === "rejected") { failedRequests++; continue; }
      successfulRequests++;

      for (const p of r.value) {
        rawItemsCount++;
        if (isHardExclude(p)) { removedByHardExclude++; continue; }
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

    // ── Supabase enrichment (fast for ~30 products) ──────────────────────────
    let enriched = diversified;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const today     = new Date().toISOString().slice(0, 10);
      const withDeltas = await enrichWithDeltas(diversified, today);
      enriched = [...withDeltas].sort((a, b) => b.score - a.score);
    }

    // Hard limit: homepage shows top N only
    const final = enriched.slice(0, HOMEPAGE_PRODUCT_LIMIT);

    const totalReviewCount  = final.reduce((s, p) => s + (p.rawReviewCount ?? 0), 0);
    const totalReviewsDelta = final.reduce((s, p) => s + (p.reviewsDelta    ?? 0), 0);
    const avgRating         = final.length > 0
      ? final.reduce((s, p) => s + p.rating, 0) / final.length
      : 0;

    const stats: FetchStats = {
      rawItemsCount,
      removedByHardExclude,
      penalizedLowSignal,
      afterQualityFilterCount: rawItemsCount - removedByHardExclude,
      afterDedupeCount:        sorted.length,
      diversityCollapsed:      collapsedCount,
      diversityAdjustedCount:  diversified.length,
      finalCount:              final.length,
      successfulRequests,
      failedRequests,
      averageRating:           Math.round(avgRating * 100) / 100,
      totalReviewCount,
      totalReviewsDelta,
    };

    return { products: final, stats };
  } catch {
    return null;
  }
}
