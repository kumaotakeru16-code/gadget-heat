// Extracts structured product keys and image search queries from Rakuten product names.
//
// Rakuten names are already normalized (promotional words removed, 40-char limit).
// The remaining challenge: Japanese category words mixed with ASCII brand+model tokens.
//
// Strategy:
//   1. Extract tokens that are ≥80% ASCII characters (brand names, model numbers)
//   2. Deduplicate while preserving order (handles repeated tokens like "RS 3 Mini RS 3")
//   3. Take first 5 tokens as the product key / search query

// Returns tokens that are primarily ASCII — brand names and model numbers.
function extractAsciiTokens(text: string): string[] {
  return text
    .split(/[\s　]+/) // split on ASCII + full-width spaces
    .filter((t) => {
      if (t.length < 2) return false;
      const asciiChars = (t.match(/[A-Za-z0-9\-\.]/g) ?? []).length;
      return asciiChars / t.length >= 0.8;
    });
}

// Removes duplicate tokens (case-insensitive), preserving first occurrence order.
function dedupeOrdered(tokens: string[]): string[] {
  const seen = new Set<string>();
  return tokens.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

type ProductLike = { name: string; brand?: string };

// Builds a compact brand + model identifier string used as the imageOverrides key.
//
// Examples:
//   "カメラ ジンバル DJI RS 3 Mini RS 3"  → "DJI RS 3 Mini"
//   "Sennheiser ゼンハイザー MKE 600"      → "Sennheiser MKE 600"
//   "RODE ワイヤレスマイク NT-SF1"          → "RODE NT-SF1"
//   "カーボン三脚 ベルボン"                  → "ベルボン" (fallback: brand ?? name slice)
export function buildProductKey(product: ProductLike): string {
  const tokens = dedupeOrdered(extractAsciiTokens(product.name));
  if (tokens.length >= 2) return tokens.slice(0, 5).join(" ");

  // Fallback: prefer brand hint from normalizer, then raw name slice
  const prefix = product.brand ? `${product.brand} ` : "";
  return `${prefix}${product.name}`.slice(0, 50).trim();
}

// Builds the Amazon (or other source) search query for finding a matching image.
// Currently the same as productKey; may diverge (e.g. locale suffix, category hint).
export function buildImageSearchQuery(product: ProductLike): string {
  return buildProductKey(product);
}
