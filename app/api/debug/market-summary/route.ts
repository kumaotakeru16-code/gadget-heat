// GET /api/debug/market-summary
//
// Per-market and per-subcat product count summary.
// Shows which categories are well-covered vs. weak, and per-keyword breakdown.
//
// Auth:   ?secret=<ADMIN_SECRET>  (optional in local dev when ADMIN_SECRET is unset)
// Format: ?format=json (default) | ?format=html
//
// Uses page-1-only fetch (hits:30) for speed. Numbers are a sample,
// not the full production pool. Good for spotting zero/weak categories.

import { NextRequest, NextResponse } from "next/server";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import { marketById } from "@/data/markets";
import { searchRakuten } from "@/lib/rakuten";
import { withConcurrency, withRetry } from "@/lib/categoryFetch";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordStat {
  keyword:           string | undefined;
  genreId:           number | undefined;
  marketId:          string;
  marketName:        string;
  cat:               string;
  apiTotal:          number;   // Rakuten meta.count (total available for this query)
  received:          number;   // items on page 1 before app filters
  excludedByKeyword: number;   // keyword-excluded (ふるさと納税 etc.)
  lowSignal:         number;   // reviewCount < 3 or rating = 0
  final:             number;   // clean items
  failed:            boolean;
  error?:            string;
}

interface SubcatStat {
  cat:   string;
  count: number;
  weak:  boolean;  // count < 3
}

interface MarketStat {
  marketId:    string;
  marketName:  string;
  count:       number;
  subcats:     SubcatStat[];
  weakSubcats: string[];
}

interface Summary {
  generatedAt:       string;
  note:              string;
  totalKeywordCalls: number;
  successfulCalls:   number;
  failedCalls:       number;
  totalFinal:        number;
  markets:           MarketStat[];
  keywords:          KeywordStat[];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const configured = process.env.ADMIN_SECRET?.trim();
  if (configured) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== configured) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";

  // One call per category entry, page 1 only (representative sample)
  const calls = MARKET_CATEGORIES.flatMap((mc) =>
    mc.categories.map((entry) => ({
      marketId: mc.marketId,
      keyword:  entry.keyword,
      genreId:  entry.genreId,
      cat:      entry.cat,
    }))
  );

  const tasks = calls.map((call) => async (): Promise<KeywordStat> => {
    try {
      const result = await withRetry(() =>
        searchRakuten({
          keyword:          call.keyword,
          genreId:          call.genreId,
          market:           call.marketId,
          cat:              call.cat,
          hits:             30,
          page:             1,
          includeLowSignal: true,
        })
      );
      const lowSignal = result.items.filter(
        (p) => p.rawReviewCount < 3 || p.rating === 0
      ).length;
      return {
        keyword:           call.keyword,
        genreId:           call.genreId,
        marketId:          call.marketId,
        marketName:        marketById(call.marketId).name,
        cat:               call.cat,
        apiTotal:          result.meta.count,
        received:          result.items.length + result.excludedItems.length,
        excludedByKeyword: result.excludedItems.length,
        lowSignal,
        final:             result.items.length - lowSignal,
        failed:            false,
      };
    } catch (err) {
      return {
        keyword:           call.keyword,
        genreId:           call.genreId,
        marketId:          call.marketId,
        marketName:        marketById(call.marketId).name,
        cat:               call.cat,
        apiTotal:          0,
        received:          0,
        excludedByKeyword: 0,
        lowSignal:         0,
        final:             0,
        failed:            true,
        error:             err instanceof Error ? err.message.slice(0, 120) : "unknown",
      };
    }
  });

  // concurrency 3, 500 ms gap — slightly looser than production to finish faster
  const settled  = await withConcurrency(tasks, 3, 500);
  const kwStats: KeywordStat[] = settled
    .filter((r): r is PromiseFulfilledResult<KeywordStat> => r.status === "fulfilled")
    .map((r) => r.value);

  // Aggregate final counts by marketId → cat
  const mktMap = new Map<string, Map<string, number>>();
  for (const s of kwStats) {
    if (!mktMap.has(s.marketId)) mktMap.set(s.marketId, new Map());
    const catMap = mktMap.get(s.marketId)!;
    catMap.set(s.cat, (catMap.get(s.cat) ?? 0) + (s.failed ? 0 : s.final));
  }

  // Build market stats preserving MARKET_CATEGORIES declaration order,
  // deduplicating cats that appear in multiple keywords
  const markets: MarketStat[] = MARKET_CATEGORIES.map((mc) => {
    const catMap  = mktMap.get(mc.marketId) ?? new Map<string, number>();
    const seen    = new Set<string>();
    const subcats: SubcatStat[] = [];
    for (const entry of mc.categories) {
      if (seen.has(entry.cat)) continue;
      seen.add(entry.cat);
      const count = catMap.get(entry.cat) ?? 0;
      subcats.push({ cat: entry.cat, count, weak: count < 3 });
    }
    subcats.sort((a, b) => b.count - a.count);
    const count = subcats.reduce((s, sc) => s + sc.count, 0);
    return {
      marketId:    mc.marketId,
      marketName:  marketById(mc.marketId).name,
      count,
      subcats,
      weakSubcats: subcats.filter((sc) => sc.weak).map((sc) => `${sc.cat}(${sc.count})`),
    };
  });

  const summary: Summary = {
    generatedAt:       new Date().toISOString(),
    note:              "Page-1 sample only (hits:30 per keyword). Counts are lower bounds.",
    totalKeywordCalls: kwStats.length,
    successfulCalls:   kwStats.filter((s) => !s.failed).length,
    failedCalls:       kwStats.filter((s) => s.failed).length,
    totalFinal:        markets.reduce((s, m) => s + m.count, 0),
    markets,
    keywords:          kwStats,
  };

  if (format === "html") {
    return new NextResponse(renderHtml(summary), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json(summary);
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHtml(s: Summary): string {
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, 'Geist Mono', 'JetBrains Mono', monospace;
      font-size: 12px; line-height: 1.65;
      padding: 32px 40px 64px;
      background: #f9f8f5; color: #18181a;
    }
    a { color: inherit; }
    h1 { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 4px; }
    .meta { color: #999; font-size: 11px; margin-bottom: 40px; }
    .meta b { color: #333; }
    h2 {
      font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
      color: #aaa; margin: 40px 0 10px;
      padding-bottom: 5px; border-bottom: 1px solid #e6e3da;
    }
    table { border-collapse: collapse; width: 100%; }
    th {
      text-align: left; font-size: 10px; font-weight: 500; color: #bbb;
      padding: 2px 20px 4px 0; border-bottom: 1px solid #e6e3da;
      white-space: nowrap;
    }
    td { padding: 3px 20px 3px 0; border-bottom: 1px solid #f0ede5; white-space: nowrap; vertical-align: top; }
    .r  { text-align: right; font-variant-numeric: tabular-nums; }
    .dim { color: #bbb; }
    .ok   { color: #2d7a4e; }
    .weak { color: #a05f10; }
    .zero { color: #b83030; font-weight: 600; }
    .fail { color: #b83030; font-style: italic; }
    .pill {
      display: inline-block; padding: 1px 6px; border-radius: 3px;
      font-size: 9px; letter-spacing: 0.05em; margin: 0 2px 2px 0;
    }
    .p-ok   { background: #e6f4ec; color: #2d7a4e; }
    .p-weak { background: #fef4e2; color: #9a5910; }
    .p-zero { background: #fde9e7; color: #b83030; }
    .note { font-size: 10px; color: #aaa; margin: 6px 0 12px; }
  `;

  // ── Market overview ──────────────────────────────────────────────────────────
  const mktRows = s.markets.map((m) => {
    const badgeCell = m.weakSubcats.length === 0
      ? `<span class="ok">✓ all ≥ 3</span>`
      : m.weakSubcats.map((w) => {
          const cls = w.endsWith("(0)") ? "p-zero" : "p-weak";
          return `<span class="pill ${cls}">${esc(w)}</span>`;
        }).join("");
    return `<tr>
      <td><b>${esc(m.marketName)}</b></td>
      <td class="r"><b>${m.count}</b></td>
      <td>${badgeCell}</td>
    </tr>`;
  }).join("");

  // ── Subcat detail ────────────────────────────────────────────────────────────
  const subcatRows = s.markets.flatMap((m) =>
    m.subcats.map((sc) => {
      const cls    = sc.count === 0 ? "zero" : sc.count < 3 ? "weak" : "ok";
      const badge  = sc.count === 0 ? "⚠ ZERO" : sc.count < 3 ? "▲ WEAK" : "✓";
      return `<tr>
        <td class="dim">${esc(m.marketName)}</td>
        <td class="${cls}">${esc(sc.cat)}</td>
        <td class="r ${cls}"><b>${sc.count}</b></td>
        <td class="${cls}">${badge}</td>
      </tr>`;
    })
  ).join("");

  // ── Keyword breakdown ────────────────────────────────────────────────────────
  const kwRows = s.keywords.map((kw) => {
    const kwShort = kw.keyword
      ? (kw.keyword.length > 28 ? esc(kw.keyword.slice(0, 28)) + "…" : esc(kw.keyword))
      : `<span class="dim">—</span>`;
    const kwTitle = kw.keyword ? ` title="${esc(kw.keyword)}"` : "";
    const genreCell = kw.genreId != null
      ? `<span style="font-variant-numeric:tabular-nums">${kw.genreId}</span>`
      : `<span class="dim">—</span>`;
    if (kw.failed) {
      return `<tr class="fail">
        <td class="dim">${esc(kw.marketName)}</td>
        <td>${esc(kw.cat)}</td>
        <td${kwTitle}>${kwShort}</td>
        <td class="dim">${genreCell}</td>
        <td colspan="5">⚠ ${esc(kw.error ?? "failed")}</td>
      </tr>`;
    }
    const fCls = kw.final === 0 ? "zero" : kw.final < 3 ? "weak" : "";
    return `<tr>
      <td class="dim">${esc(kw.marketName)}</td>
      <td>${esc(kw.cat)}</td>
      <td${kwTitle}>${kwShort}</td>
      <td class="dim">${genreCell}</td>
      <td class="r dim">${kw.apiTotal.toLocaleString()}</td>
      <td class="r">${kw.received}</td>
      <td class="r dim">${kw.excludedByKeyword > 0 ? `-${kw.excludedByKeyword}` : "—"}</td>
      <td class="r dim">${kw.lowSignal > 0 ? `-${kw.lowSignal}` : "—"}</td>
      <td class="r ${fCls}"><b>${kw.final}</b></td>
    </tr>`;
  }).join("");

  const failBadge = s.failedCalls > 0
    ? ` &nbsp;·&nbsp; <span class="fail">${s.failedCalls} failed</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gadget Heat · Market Summary</title>
  <style>${css}</style>
</head>
<body>
  <h1>Gadget Heat · Market Summary</h1>
  <p class="meta">
    ${esc(s.generatedAt)} &nbsp;·&nbsp;
    ${s.totalKeywordCalls} keywords &nbsp;·&nbsp;
    <span class="ok">${s.successfulCalls} OK</span>${failBadge}
    &nbsp;·&nbsp; <b>${s.totalFinal}</b> final products
    &nbsp;·&nbsp; <span class="dim">${esc(s.note)}</span>
  </p>

  <h2>Market Overview</h2>
  <table>
    <thead>
      <tr>
        <th>Market</th>
        <th class="r">Products</th>
        <th>Weak Subcats (count &lt; 3)</th>
      </tr>
    </thead>
    <tbody>${mktRows}</tbody>
  </table>

  <h2>Subcat Detail</h2>
  <table>
    <thead>
      <tr><th>Market</th><th>Subcat</th><th class="r">Count</th><th>Status</th></tr>
    </thead>
    <tbody>${subcatRows}</tbody>
  </table>

  <h2>Keyword Breakdown</h2>
  <p class="note">
    genreId = Rakuten genre ID (restricts search to genre tree; "—" = keyword-only).
    API Total = Rakuten total hits for this query (not all fetched).
    Received = items on page 1 before our filters.
    −KW = excluded by keyword pattern (ふるさと納税 etc.).
    −Low Sig = reviewCount &lt; 3 or rating = 0.
    Final = usable items.
  </p>
  <table>
    <thead>
      <tr>
        <th>Market</th>
        <th>Cat</th>
        <th>Keyword</th>
        <th>genreId</th>
        <th class="r">API Total</th>
        <th class="r">Received</th>
        <th class="r">−KW</th>
        <th class="r">−Low Sig</th>
        <th class="r">Final</th>
      </tr>
    </thead>
    <tbody>${kwRows}</tbody>
  </table>
</body>
</html>`;
}
