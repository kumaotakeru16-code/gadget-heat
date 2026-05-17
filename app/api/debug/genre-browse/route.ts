// GET /api/debug/genre-browse
//
// Browses the Rakuten IchibaGenre hierarchy so you can discover
// the genreId values to add to data/marketCategories.ts.
//
// Usage:
//   Start at the root:   /api/debug/genre-browse?secret=...
//   Drill into a genre:  /api/debug/genre-browse?secret=...&genreId=100227
//   HTML view:           /api/debug/genre-browse?secret=...&genreId=100227&format=html
//
// Workflow:
//   1. Open ?format=html at root (genreId=0)
//   2. Click a child genre to drill down
//   3. Find the genre that matches your Life Gadget category
//   4. Copy its genreId into marketCategories.ts CategoryEntry.genreId
//
// Auth: ?secret=<ADMIN_SECRET> (optional in local dev when ADMIN_SECRET is unset)

import { NextRequest, NextResponse } from "next/server";
import { fetchRakutenGenre, type RakutenGenreItem } from "@/lib/rakutenGenre";

export const dynamic    = "force-dynamic";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const configured = process.env.ADMIN_SECRET?.trim();
  if (configured) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== configured) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const genreId = parseInt(req.nextUrl.searchParams.get("genreId") ?? "0", 10);
  const format  = req.nextUrl.searchParams.get("format") ?? "json";
  const secret  = req.nextUrl.searchParams.get("secret") ?? "";

  try {
    const result = await fetchRakutenGenre(isNaN(genreId) ? 0 : genreId);

    if (format === "html") {
      return new NextResponse(renderHtml(result, secret, req.nextUrl.origin), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (format === "html") {
      return new NextResponse(errorHtml(msg), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function browseUrl(genreId: number, secret: string, origin: string): string {
  const p = new URLSearchParams({ genreId: String(genreId), format: "html" });
  if (secret) p.set("secret", secret);
  return `${origin}/api/debug/genre-browse?${p.toString()}`;
}

function renderHtml(
  result: Awaited<ReturnType<typeof fetchRakutenGenre>>,
  secret: string,
  origin: string,
): string {
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, 'Geist Mono', 'JetBrains Mono', monospace;
      font-size: 13px; line-height: 1.65;
      padding: 32px 40px 64px;
      background: #f9f8f5; color: #18181a;
    }
    h1 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #999; font-size: 11px; margin-bottom: 32px; }
    h2 { font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
         color: #aaa; margin: 28px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #e6e3da; }
    .breadcrumb { display: flex; gap: 4px; align-items: center; margin-bottom: 28px;
                  font-size: 11px; flex-wrap: wrap; }
    .breadcrumb a { color: #5a8fcc; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb .sep { color: #ccc; }
    .current-card {
      padding: 14px 18px; border: 1px solid #e0ddd6;
      border-radius: 6px; background: #fff; margin-bottom: 24px;
      display: inline-block;
    }
    .gid { font-size: 11px; color: #999; margin-top: 2px; }
    .gid b { color: #333; font-size: 13px; }
    .copy { font-family: ui-monospace, monospace; background: #f0ede8;
            padding: 2px 6px; border-radius: 3px; font-size: 11px; color: #555; }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; font-size: 10px; font-weight: 500; color: #bbb;
         padding: 2px 20px 5px 0; border-bottom: 1px solid #e6e3da; }
    td { padding: 5px 20px 5px 0; border-bottom: 1px solid #f0ede5; }
    td a { color: #5a8fcc; text-decoration: none; font-weight: 500; }
    td a:hover { text-decoration: underline; }
    .id-cell { font-variant-numeric: tabular-nums; color: #888; font-size: 11px; }
    .lvl-cell { color: #bbb; font-size: 11px; }
    .add-note { font-size: 10px; color: #aaa; margin-top: 4px; }
    .snippet { font-family: ui-monospace, monospace; font-size: 10px;
               background: #f5f3ee; padding: 1px 6px; border-radius: 3px; color: #666; }
  `;

  const parentBreadcrumbs = result.parents.map((p) =>
    `<a href="${esc(browseUrl(p.genreId, secret, origin))}">${esc(p.genreName)}</a>`
  ).join(`<span class="sep">›</span>`);

  const breadcrumb = result.parents.length > 0
    ? `${parentBreadcrumbs}<span class="sep">›</span><b>${esc(result.current.genreName)}</b>`
    : `<b>${esc(result.current.genreName)}</b>`;

  const childRows = result.children.length === 0
    ? `<tr><td colspan="4" style="color:#bbb;padding:12px 0">No child genres (leaf node)</td></tr>`
    : result.children.map((c) => {
        const snippet = `genreId: ${c.genreId}`;
        return `<tr>
          <td><a href="${esc(browseUrl(c.genreId, secret, origin))}">${esc(c.genreName)}</a></td>
          <td class="id-cell">${c.genreId}</td>
          <td class="lvl-cell">L${c.genreLevel}</td>
          <td><span class="snippet">${esc(snippet)}</span></td>
        </tr>`;
      }).join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Genre Browser · Gadget Heat</title>
  <style>${css}</style>
</head>
<body>
  <h1>Gadget Heat · Genre Browser</h1>
  <p class="meta">Rakuten IchibaGenre hierarchy. Click a child genre to drill down.
    Copy <span class="copy">genreId</span> into <span class="copy">marketCategories.ts</span>.</p>

  <div class="breadcrumb">${breadcrumb}</div>

  <div class="current-card">
    <div><b>${esc(result.current.genreName)}</b></div>
    <div class="gid">genreId: <b>${result.current.genreId}</b> &nbsp;·&nbsp; Level ${result.current.genreLevel}</div>
    <div class="add-note" style="margin-top:6px">
      Add to marketCategories.ts:
      <span class="snippet">genreId: ${result.current.genreId}</span>
    </div>
  </div>

  <h2>Child Genres (${result.children.length})</h2>
  <table>
    <thead><tr><th>Name</th><th>genreId</th><th>Level</th><th>Copy snippet</th></tr></thead>
    <tbody>${childRows}</tbody>
  </table>
</body>
</html>`;
}

function errorHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:monospace;padding:32px">
<h2 style="color:#b83030">Genre API Error</h2>
<pre style="margin-top:12px;background:#fde9e7;padding:12px;border-radius:4px">${esc(msg)}</pre>
<p style="margin-top:16px;color:#999;font-size:12px">Check that RAKUTEN_APPLICATION_ID is set in .env.local</p>
</body></html>`;
}
