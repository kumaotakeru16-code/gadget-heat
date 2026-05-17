import { NextRequest, NextResponse } from "next/server";
import { searchRakuten } from "@/lib/rakuten";

export const runtime = "nodejs";

// GET /api/rakuten/search
// Query params: keyword, genreId, page, hits, market, cat, debug
//
// Example:
//   /api/rakuten/search?keyword=DJI%20Mic&hits=10
//   /api/rakuten/search?keyword=DJI%20Mic&hits=1&debug=true

function buildDebugInfo() {
  const appId     = (process.env.RAKUTEN_APPLICATION_ID ?? "").trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY     ?? "").trim();
  const referer   = (process.env.RAKUTEN_REFERER        ?? "").trim() || "http://localhost:3002";
  return {
    endpoint:           "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601",
    hasApplicationId:   appId.length > 0,
    applicationIdLength: appId.length,
    hasAccessKey:       accessKey.length > 0,
    accessKeyLength:    accessKey.length,
    refererHeader:      referer,
    originHeader:       referer,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const keyword  = searchParams.get("keyword")  ?? undefined;
  const genreIdRaw = searchParams.get("genreId");
  const genreId    = genreIdRaw != null ? parseInt(genreIdRaw, 10) : undefined;
  const market   = searchParams.get("market")   ?? undefined;
  const cat      = searchParams.get("cat")      ?? undefined;
  const page             = Number(searchParams.get("page")  ?? "1");
  const hits             = Number(searchParams.get("hits")  ?? "10");
  const debug            = searchParams.get("debug")            === "true";
  const includeLowSignal = searchParams.get("includeLowSignal") === "true";

  if (!keyword && !genreId) {
    return NextResponse.json(
      { error: "keyword または genreId のどちらかは必須です" },
      { status: 400 }
    );
  }

  try {
    const result = await searchRakuten({ keyword, genreId, page, hits, market, cat, includeLowSignal });
    if (debug) {
      return NextResponse.json({ ...result, _debug: buildDebugInfo() });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const isConfigError = message.includes("is not set");
    const status = isConfigError ? 503 : 502;
    const error  = isConfigError ? "API key not configured" : "Rakuten API request failed";

    return NextResponse.json(
      { error, detail: message, ...(debug ? { _debug: buildDebugInfo() } : {}) },
      { status }
    );
  }
}
