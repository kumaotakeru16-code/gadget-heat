import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const appId     = (process.env.RAKUTEN_APPLICATION_ID ?? "").trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY     ?? "").trim();

  return NextResponse.json({
    hasApplicationId:    appId.length > 0,
    applicationIdLength: appId.length,
    applicationIdPrefix: appId.slice(0, 4),
    hasAccessKey:        accessKey.length > 0,
    accessKeyLength:     accessKey.length,
    accessKeyPrefix:     accessKey.slice(0, 4),
  });
}
