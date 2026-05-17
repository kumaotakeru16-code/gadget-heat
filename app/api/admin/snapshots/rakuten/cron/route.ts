// GET /api/admin/snapshots/rakuten/cron?secret=<ADMIN_SECRET>
//
// Vercel Cron target — called daily at UTC 15:00 (JST 00:00).
// Vercel Cron cannot send Authorization headers, so auth is via query param.
// The manual POST route (/api/admin/snapshots/rakuten) is unaffected.

import { NextRequest, NextResponse } from "next/server";
import { fetchTopMovers } from "@/lib/fetchTopMovers";
import { saveProductSnapshots } from "@/lib/snapshots";

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provided = req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await fetchTopMovers("jp");
  if (!products || products.length === 0) {
    return NextResponse.json({ error: "No products fetched" }, { status: 502 });
  }

  const { saved, errors } = await saveProductSnapshots(products);

  return NextResponse.json({
    ok:    errors.length === 0,
    saved,
    total: products.length,
    errors,
    date:  new Date().toISOString().slice(0, 10),
  });
}
