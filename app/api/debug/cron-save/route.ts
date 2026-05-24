// GET /api/debug/cron-save?secret=<ADMIN_SECRET>[&save=true]
//
// Diagnostic endpoint for snapshot save issues.
//
// Without &save=true  — dry-run: shows DB state and what WOULD be saved.
// With    &save=true  — does the actual save and reports before/after counts.
//
// Returns:
//   dbToday          — rows in DB with today's captured_date (before save)
//   dbNullDate       — rows in DB with NULL captured_date (schema issue indicator)
//   dbTotal          — total rows in gadget_product_snapshots
//   fetchedProducts  — live products fetched from Rakuten
//   sampleRows       — first 3 rows that would be saved (inspect payload)
//   saved            — new rows inserted (after - before), only when &save=true
//   alreadyExisted   — rows that were already there for today
//   dbTodayAfter     — rows in DB for today after save
//   errors           — any upsert errors

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { fetchTopMovers } from "@/lib/fetchTopMovers";
import { saveProductSnapshots } from "@/lib/snapshots";

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  if (searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doSave = searchParams.get("save") === "true";
  const today  = new Date().toISOString().slice(0, 10);

  const db = getSupabase();
  if (!db) {
    return NextResponse.json({ error: "Supabase not configured — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }

  // ── 1. DB state BEFORE any save ──────────────────────────────────────────
  const [
    { count: dbToday },
    { count: dbNullDate },
    { count: dbTotal },
    { data: recentRows },
  ] = await Promise.all([
    db.from("gadget_product_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("captured_date", today),

    db.from("gadget_product_snapshots")
      .select("*", { count: "exact", head: true })
      .is("captured_date", null),

    db.from("gadget_product_snapshots")
      .select("*", { count: "exact", head: true }),

    // Sample of most-recent rows to inspect what's actually in DB
    db.from("gadget_product_snapshots")
      .select("source,product_id,product_key,market,cat,name,review_count,rating,captured_date")
      .order("captured_date", { ascending: false })
      .limit(5),
  ]);

  // ── 2. Fetch live products ────────────────────────────────────────────────
  const fetchResult = await fetchTopMovers("jp");
  const fetchedProducts = fetchResult?.products ?? [];

  // Sample of rows that would be saved — lets you inspect product_id, source, etc.
  const sampleRows = fetchedProducts.slice(0, 3).map((p) => ({
    product_id:   p.id,
    source:       p.source ?? "rakuten",
    market:       p.market,
    cat:          p.cat,
    name:         p.name?.slice(0, 40),
    review_count: p.rawReviewCount,
    rating:       p.rating,
    score:        p.score,
    captured_date: "(set by DB DEFAULT — not in payload)",
  }));

  // ── 3. Optional actual save ───────────────────────────────────────────────
  let saveResult: {
    saved: number;
    alreadyExisted: number;
    errors: string[];
    dbCountForToday: number | null;
  } | null = null;

  if (doSave && fetchedProducts.length > 0) {
    saveResult = await saveProductSnapshots(fetchedProducts);
  }

  // ── 4. Response ───────────────────────────────────────────────────────────
  return NextResponse.json({
    date:    today,
    dryRun: !doSave,

    // DB state before save
    dbBefore: {
      rowsForToday:    dbToday    ?? 0,
      rowsWithNullDate: dbNullDate ?? 0,
      totalRows:        dbTotal    ?? 0,
      recentRows:       recentRows ?? [],
    },

    // What would be / was saved
    fetchedProducts: fetchedProducts.length,
    sampleRows,

    // Save result (null if dry-run)
    saveResult,

    // Diagnosis hints
    diagnosis: buildDiagnosis({
      dbToday:       dbToday    ?? 0,
      dbNullDate:    dbNullDate ?? 0,
      dbTotal:       dbTotal    ?? 0,
      fetched:       fetchedProducts.length,
      saved:         saveResult?.saved ?? null,
      alreadyExisted: saveResult?.alreadyExisted ?? null,
      errors:        saveResult?.errors ?? [],
      doSave,
    }),
  });
}

function buildDiagnosis({
  dbToday,
  dbNullDate,
  dbTotal,
  fetched,
  saved,
  alreadyExisted,
  errors,
  doSave,
}: {
  dbToday: number;
  dbNullDate: number;
  dbTotal: number;
  fetched: number;
  saved: number | null;
  alreadyExisted: number | null;
  errors: string[];
  doSave: boolean;
}): string[] {
  const hints: string[] = [];

  if (dbNullDate > 0) {
    hints.push(
      `⚠ DB contains ${dbNullDate} rows with NULL captured_date. ` +
      `These rows are invisible to enrichWithDeltas (which queries .lt("captured_date", date)). ` +
      `Root cause: captured_date has no DB DEFAULT. ` +
      `Fix: ALTER TABLE gadget_product_snapshots ALTER COLUMN captured_date SET DEFAULT CURRENT_DATE;`
    );
  }

  if (dbTotal === 0 && !doSave) {
    hints.push("ℹ DB is empty — no snapshots have ever been saved. Run with &save=true to populate.");
  }

  if (dbToday > 0 && fetched > 0) {
    hints.push(
      `ℹ ${dbToday} rows already exist for today. ` +
      `Running cron again today would return saved:0 (idempotent — this is correct behavior, not a bug).`
    );
  }

  if (doSave && saved !== null && saved === 0 && (alreadyExisted ?? 0) === 0) {
    hints.push(
      "⚠ save=true but saved:0 and alreadyExisted:0. " +
      "Possible causes: (1) captured_date has no DEFAULT so ON CONFLICT target never matches, " +
      "(2) unique constraint on DB doesn't match onConflict columns (source,product_id,captured_date), " +
      "(3) product_id is empty/null in fetched products."
    );
  }

  if (doSave && saved !== null && saved > 0) {
    hints.push(`✓ ${saved} new snapshots saved successfully.`);
  }

  if (doSave && (alreadyExisted ?? 0) > 0 && (saved ?? 0) === 0) {
    hints.push(
      `ℹ All ${alreadyExisted} rows already existed for today — this is correct idempotent behavior. ` +
      `The previous 'saved:0' report was accurate, not a bug.`
    );
  }

  if (errors.length > 0) {
    hints.push(`✗ Upsert errors: ${errors.join("; ")}`);
  }

  if (fetched === 0) {
    hints.push("⚠ fetchTopMovers returned 0 products — Rakuten API may be unreachable.");
  }

  return hints;
}
