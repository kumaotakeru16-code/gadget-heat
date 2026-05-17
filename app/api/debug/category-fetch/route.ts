// GET /api/debug/category-fetch
//
// Runs the full category-sweep pipeline in debug mode and returns a detailed
// breakdown of how many items survive each filtering stage.
//
// Auth: ?secret=<ADMIN_SECRET>  (same token as admin snapshot routes)
//
// Query params:
//   ?market=all|audio|support|…  (default: all)
//   ?minReviews=3                (default: 3)
//   ?minRating=3.8               (default: 3.8)
//   ?secret=<ADMIN_SECRET>
//
// This route is intentionally slow (it calls Rakuten for every category).
// Use it only for debugging — not in the hot render path.

import { NextRequest, NextResponse } from "next/server";
import { fetchByCategoriesDebug } from "@/lib/categoryFetchDebug";

export const dynamic = "force-dynamic"; // never cache this route

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();

  // Require auth in production; allow open access in local dev (no secret set)
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const market     = req.nextUrl.searchParams.get("market")     ?? "all";
  const minReviews = parseInt(req.nextUrl.searchParams.get("minReviews") ?? "3",  10);
  const minRating  = parseFloat(req.nextUrl.searchParams.get("minRating") ?? "3.8");

  const report = await fetchByCategoriesDebug({
    marketFilter: market,
    minReviews:   isNaN(minReviews) ? 3   : minReviews,
    minRating:    isNaN(minRating)  ? 3.8 : minRating,
  });

  return NextResponse.json(report, {
    headers: { "Content-Type": "application/json" },
  });
}
