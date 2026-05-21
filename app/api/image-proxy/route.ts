import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "thumbnail.image.rakuten.co.jp",
  "image.rakuten.co.jp",
  "shop.r10s.jp",
];

// Private/loopback IP ranges — block to prevent SSRF
const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/i;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Protocol check
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("Forbidden protocol", { status: 403 });
  }

  // Host allowlist
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  // Block private/loopback IPs (hostname-level check)
  if (PRIVATE_IP_RE.test(parsed.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(raw, {
      redirect: "follow",
      headers: { "User-Agent": "GadgetHeat/1.0 ImageProxy" },
    });
  } catch {
    return new NextResponse("Failed to fetch upstream image", { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Upstream is not an image", { status: 400 });
  }

  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":  contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
