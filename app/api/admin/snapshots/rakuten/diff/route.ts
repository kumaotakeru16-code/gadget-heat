// GET /api/admin/snapshots/rakuten/diff?date=YYYY-MM-DD
//
// Returns today's snapshot rows joined with the previous day's rows,
// producing delta fields (reviewsDelta, ratingChg, priceChg, scoreChg).
//
// If ?date is omitted, "today" defaults to the server's current date.
// Auth: Bearer token via ADMIN_SECRET env var.

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { computeDeltas, getPreviousSnapshots } from "@/lib/snapshots";
import type { Product } from "@/data/products";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return unauthorized();

  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (bearer !== secret && querySecret !== secret) return unauthorized();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const db = getSupabase();
  if (!db) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Fetch today's snapshot rows.
  const { data: todayRows, error } = await db
    .from("gadget_product_snapshots")
    .select("*")
    .eq("captured_date", date)
    .order("score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!todayRows || todayRows.length === 0) {
    return NextResponse.json({ error: `No snapshot found for ${date}` }, { status: 404 });
  }

  // Map DB rows back to Product shape so computeDeltas() can process them.
  const todayProducts: Product[] = todayRows.map((r) => ({
    id:              r.product_id,
    name:            r.name ?? "",
    brand:           r.brand ?? "",
    cat:             r.cat ?? "",
    market:          r.market,
    score:           r.score ?? 0,
    scoreChg:        0,
    scoreChg24h:     0,
    spark:           [],
    price:           r.price ?? 0,
    priceChg:        0,
    rating:          r.rating ?? 0,
    ratingChg:       0,
    reviewsDelta:    0,
    reviewsVelocity: 0,
    rankUp:          0,
    isNew:           false,
    color:           "oklch(0.88 0.03 70)",
    aux:             [],
    imageUrl:        r.image_url ?? undefined,
    itemUrl:         r.item_url ?? undefined,
    rawReviewCount:  r.review_count ?? undefined,
    source:          (r.source as Product["source"]) ?? "rakuten",
  }));

  const keys = todayRows.map((r) => r.product_key as string);
  const prevMap = await getPreviousSnapshots(keys, date);
  const enriched = computeDeltas(todayProducts, prevMap);

  return NextResponse.json({
    date,
    count:    enriched.length,
    products: enriched.map((p) => ({
      id:              p.id,
      name:            p.name,
      brand:           p.brand,
      market:          p.market,
      score:           p.score,
      scoreChg:        p.scoreChg,
      reviewsDelta:    p.reviewsDelta,
      reviewsVelocity: p.reviewsVelocity,
      ratingChg:       p.ratingChg,
      priceChg:        p.priceChg,
      price:           p.price,
      rating:          p.rating,
      rawReviewCount:  p.rawReviewCount,
    })),
  });
}
