// POST /api/admin/snapshots/rakuten
//
// Saves the current live top-movers snapshot to Supabase.
// Intended for a daily cron (Vercel Cron, GitHub Actions, etc.).
//
// Auth: Bearer token via ADMIN_SECRET env var.
// Idempotent: duplicate saves on the same calendar day are silently ignored.

import { NextRequest, NextResponse } from "next/server";
import { fetchTopMovers } from "@/lib/fetchTopMovers";
import { saveProductSnapshots } from "@/lib/snapshots";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return unauthorized();

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return unauthorized();

  const result = await fetchTopMovers("jp");
  if (!result || result.products.length === 0) {
    return NextResponse.json({ error: "No products fetched" }, { status: 502 });
  }

  const { saved, errors } = await saveProductSnapshots(result.products);

  return NextResponse.json({
    ok:      errors.length === 0,
    saved,
    total:   result.products.length,
    errors,
    date:    new Date().toISOString().slice(0, 10),
  });
}
