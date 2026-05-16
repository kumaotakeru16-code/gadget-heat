import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RAKUTEN_API_URL =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

// Shows exactly what would be sent to Rakuten, with keys redacted.
export async function GET() {
  const appId     = (process.env.RAKUTEN_APPLICATION_ID ?? "").trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY     ?? "").trim();
  const referer   = (process.env.RAKUTEN_REFERER        ?? "").trim() || "http://localhost:3002";

  const query = new URLSearchParams({
    applicationId: "[REDACTED]",
    accessKey:     "[REDACTED]",
    keyword:       "DJI Mic",
    hits:          "1",
    page:          "1",
    format:        "json",
  });

  const finalUrl = `${RAKUTEN_API_URL}?${query.toString()}`;

  return NextResponse.json({
    endpoint:            RAKUTEN_API_URL,
    hasApplicationId:    appId.length > 0,
    hasAccessKey:        accessKey.length > 0,
    originHeader:        referer,
    refererHeader:       referer,
    finalUrlWithoutKeys: finalUrl,
  });
}
