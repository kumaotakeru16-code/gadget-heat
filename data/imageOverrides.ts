// Curated product image overrides for Gadget Heat editorial cards.
//
// Keys are substrings matched against the normalized product name (case-insensitive).
// More specific keys should come first — first match wins.
//
// Source values:
//   "official"  — manufacturer press image
//   "amazon"    — Amazon.co.jp or Amazon.com product image
//   "b_and_h"   — B&H Photo
//   "manual"    — hand-picked / custom hosted

export type ImageOverrideSource = "official" | "amazon" | "b_and_h" | "manual";

export interface ImageOverride {
  imageUrl: string;
  source: ImageOverrideSource;
  sourceUrl?: string;   // landing page the image came from (for attribution)
  updatedAt?: string;   // ISO date — helps identify stale entries
}

// ─── Override table ───────────────────────────────────────────────────────────
// Add entries as:
//   "DJI Mic 2": { imageUrl: "https://...", source: "official" }
//
// The key is matched as a case-insensitive substring of the normalized product name.

export const IMAGE_OVERRIDES: Record<string, ImageOverride> = {
  // (empty — fill as editorial images are sourced)
};

// ─── Lookup helpers ──────────────────────────────────────────────────────────

export function findImageOverride(productName: string): ImageOverride | null {
  const lower = productName.toLowerCase();
  for (const [key, override] of Object.entries(IMAGE_OVERRIDES)) {
    if (lower.includes(key.toLowerCase())) return override;
  }
  return null;
}

// Returns the best available image URL and whether it came from an override.
export function resolveImageUrl(
  productName: string,
  rakutenUrl?: string
): { url: string | undefined; isOverride: boolean } {
  const override = findImageOverride(productName);
  if (override) return { url: override.imageUrl, isOverride: true };
  return { url: rakutenUrl, isOverride: false };
}
