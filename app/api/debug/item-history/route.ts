// GET /api/debug/item-history?itemCode=<rakuten_item_code>&secret=<ADMIN_SECRET>
//
// Diagnostic endpoint: shows every snapshot for one product and the computed
// delta/velocity so you can see exactly why a product shows "Awaiting movement data".
//
// Query params:
//   itemCode  — Rakuten product_id (e.g. "shopname:item123")
//   secret    — ADMIN_SECRET value (query param auth, same as cron route)

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function computeMomentumScore(
  reviewsDelta: number,
  ratingChg: number,
  rating: number,
  rawReviewCount: number,
): number {
  const reviewMomentum  = Math.max(0, reviewsDelta) * 8;
  const ratingMomentum  = Math.max(0, ratingChg) * 120;
  const trustBonus      = rating >= 4.5 ? 8 : rating >= 4.2 ? 5 : rating >= 4.0 ? 2 : 0;
  const lowSignalPenalty = rawReviewCount < 3 ? -10 : rawReviewCount < 10 ? -5 : 0;
  return Math.max(0, Math.min(100, Math.round(
    reviewMomentum + ratingMomentum + trustBonus + lowSignalPenalty
  )));
}

function computeBaselineScore(rating: number, reviewCount: number): number {
  return Math.min(100, Math.round(rating * Math.log10(reviewCount + 10) * 12));
}

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const provided = searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemCode = searchParams.get("itemCode");
  if (!itemCode) {
    return NextResponse.json(
      { error: "Missing itemCode param. Use ?itemCode=shopname:item123" },
      { status: 400 }
    );
  }

  const db = getSupabase();
  if (!db) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Fetch ALL snapshots for this product_id, newest first.
  const { data, error } = await db
    .from("gadget_product_snapshots")
    .select("product_id,product_key,market,cat,name,brand,price,rating,review_count,score,captured_date")
    .eq("product_id", itemCode)
    .order("captured_date", { ascending: false })
    .limit(90);  // 3 months of history max

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      itemCode,
      found: false,
      message: "No snapshots found for this product_id. Check: (1) cron has run, (2) itemCode matches product_id column exactly.",
    });
  }

  const latest   = data[0];
  const previous = data[1] ?? null;

  // Compute delta between latest and previous (same logic as computeDeltas).
  let delta = null;
  if (previous) {
    const todayReviews  = latest.review_count ?? 0;
    const prevReviews   = previous.review_count ?? todayReviews;
    const reviewsDelta  = Math.max(0, todayReviews - prevReviews);

    const todayRating   = latest.rating ?? 0;
    const prevRating    = previous.rating ?? todayRating;
    const ratingChg     = parseFloat((todayRating - prevRating).toFixed(2));

    const todayPrice    = latest.price ?? 0;
    const prevPrice     = previous.price ?? todayPrice;
    const priceChg      = prevPrice > 0
      ? parseFloat((((todayPrice - prevPrice) / prevPrice) * 100).toFixed(1))
      : 0;

    const latestDate    = new Date(latest.captured_date);
    const prevDate      = new Date(previous.captured_date);
    const daysBetween   = Math.round(
      (latestDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const velocity      = daysBetween > 0
      ? parseFloat((reviewsDelta / daysBetween).toFixed(2))
      : reviewsDelta;

    const momentumScore  = computeMomentumScore(reviewsDelta, ratingChg, todayRating, todayReviews);
    const baselineScore  = computeBaselineScore(todayRating, todayReviews);

    delta = {
      latestCapturedAt:   latest.captured_date,
      previousCapturedAt: previous.captured_date,
      daysBetween,
      latestReviewCount:  latest.review_count,
      previousReviewCount: previous.review_count,
      reviewsDelta,
      velocity,
      latestRating:       latest.rating,
      previousRating:     previous.rating,
      ratingChg,
      priceChg,
      scoreType:          "movement",
      momentumScore,
      baselineScore,
      movementStatus:     reviewsDelta > 0 ? "rising" : "stable",
    };
  }

  const snapshots = data.map((r) => ({
    capturedAt:  r.captured_date,
    reviewCount: r.review_count,
    rating:      r.rating,
    price:       r.price,
    score:       r.score,
    productKey:  r.product_key,
    name:        r.name,
    market:      r.market,
    cat:         r.cat,
  }));

  return NextResponse.json({
    itemCode,
    found:         true,
    snapshotsCount: data.length,
    hasPrevious:   previous !== null,
    scoreType:     previous ? "movement" : "baseline_only",
    movementStatus: !previous
      ? "awaiting_first_comparison"
      : (delta && (delta.reviewsDelta ?? 0) > 0) ? "rising" : "stable",
    latest:    snapshots[0],
    previous:  snapshots[1] ?? null,
    delta,
    allSnapshots: snapshots,
  });
}
