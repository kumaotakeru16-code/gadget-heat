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

  const result = await fetchTopMovers("jp");
  if (!result || result.products.length === 0) {
    return NextResponse.json({ error: "No products fetched" }, { status: 502 });
  }

  const { saved, alreadyExisted, errors, dbCountForToday } = await saveProductSnapshots(result.products);

  return NextResponse.json({
    ok:             errors.length === 0,
    saved,
    alreadyExisted,
    total:          result.products.length,
    dbCountForToday,
    errors,
    date:           new Date().toISOString().slice(0, 10),
  });
}
