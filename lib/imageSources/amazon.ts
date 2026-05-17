// Amazon PA-API 5.0 image candidate search.
// Server-only — never import from client components.
//
// Auto-adoption rules (apply when implementing the API call below):
//   confidence >= 0.9 → auto-adopt into imageOverrides (source: "amazon")
//   confidence  0.7–0.9 → surface for manual review
//   confidence < 0.7 → discard
//
// Amazon image URLs must be referenced directly — never save or re-host them.

import type { ImageCandidate } from "./types";

function creds() {
  return {
    accessKey:   (process.env.AMAZON_ACCESS_KEY  ?? "").trim(),
    secretKey:   (process.env.AMAZON_SECRET_KEY  ?? "").trim(),
    partnerTag:  (process.env.AMAZON_PARTNER_TAG ?? "").trim(),
    marketplace: (process.env.AMAZON_MARKETPLACE ?? "www.amazon.co.jp").trim(),
  };
}

export function isAmazonConfigured(): boolean {
  const { accessKey, secretKey, partnerTag } = creds();
  return !!(accessKey && secretKey && partnerTag);
}

// Scores how well an Amazon title matches the target productKey.
// Returns confidence 0.0–1.0 and a human-readable reason string.
export function computeAmazonConfidence(
  productKey: string,
  amazonTitle: string
): { confidence: number; reason: string } {
  const keyTokens = productKey.toLowerCase().split(/\s+/).filter(Boolean);
  const titleLower = amazonTitle.toLowerCase();

  if (keyTokens.length === 0) {
    return { confidence: 0, reason: "empty productKey" };
  }

  const brand = keyTokens[0];
  if (!titleLower.includes(brand)) {
    return { confidence: 0, reason: `brand "${brand}" not found in title` };
  }

  const modelTokens = keyTokens.slice(1);
  if (modelTokens.length === 0) {
    return { confidence: 0.45, reason: "brand-only match (no model tokens)" };
  }

  const matched = modelTokens.filter((t) => titleLower.includes(t));
  const modelRatio = matched.length / modelTokens.length;

  // confidence: brand match base (0.35) + model coverage (up to 0.65)
  const confidence = Math.round((0.35 + modelRatio * 0.65) * 100) / 100;
  const reason = `brand ✓; model tokens ${matched.length}/${modelTokens.length} matched (${matched.join(", ")})`;

  return { confidence, reason };
}

// Searches Amazon PA-API for image candidates matching the query.
//
// Throws "Amazon credentials not configured" when env vars are missing
// (caller should return 503).
//
// Returns empty array when credentials exist but API is not yet implemented
// (caller returns 200 with empty candidates list).
export async function searchAmazonImageCandidates(
  query: string,
  productKey: string
): Promise<ImageCandidate[]> {
  if (!isAmazonConfigured()) {
    throw new Error(
      "Amazon credentials not configured. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG in .env.local."
    );
  }

  // TODO: Implement PA-API 5.0 SearchItems call.
  //
  // Endpoint: https://webservices.amazon.co.jp/paapi5/searchitems
  // Auth: AWS Signature V4 (HMAC-SHA256 — use @aws-sdk/signature-v4 or paapi5-nodejs-sdk)
  // Resources: ["Images.Primary.Large", "ItemInfo.Title", "DetailPageURL"]
  //
  // After getting results:
  //   for each item:
  //     const { confidence, reason } = computeAmazonConfidence(productKey, item.title)
  //     if (confidence >= 0.7) push to candidates
  //
  // Return candidates sorted by confidence desc.
  //
  void query;
  void productKey;
  return [];
}
