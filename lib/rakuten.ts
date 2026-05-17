// Rakuten Ichiba Item Search API client + Product normalizer.
// This module runs SERVER-SIDE ONLY. Never import from client components.

const RAKUTEN_API_URL =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

// ─── Raw Rakuten API types ────────────────────────────────────────────────────

interface RakutenItemRaw {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  reviewAverage: number;
  reviewCount: number;
  smallImageUrls: { imageUrl: string }[];
  mediumImageUrls: { imageUrl: string }[];
  shopName: string;
  genreId: string;
}

interface RakutenApiResponse {
  Items?: { Item: RakutenItemRaw }[];
  count?: number;
  page?: number;
  pageCount?: number;
  error?: string;
  error_description?: string;
}

// ─── Normalized product type returned by this module ─────────────────────────

export interface RakutenProduct {
  id: string;
  name: string;
  brand?: string;
  market: string;
  cat: string;
  score: number;
  scoreChg: number;
  scoreChg24h: number;
  reviewsDelta: number;
  reviewsVelocity: number;
  rating: number;
  ratingChg: number;
  rankUp: number;
  isNew: boolean;
  priceChg: number;
  price: number;
  imageUrl?: string;
  itemUrl: string;
  source: "rakuten";
  rawReviewCount: number;
  // UI rendering fields — computed from available data
  aux: string[];
  spark: number[];
  color: string;
}

export interface RakutenSearchMeta {
  count: number;
  page: number;
  pageCount: number;
}

export interface ExcludedItem {
  name: string;
  reason: string;
  rawReviewCount: number;
  rating: number;
  price: number;
}

export interface RakutenSearchResult {
  items: RakutenProduct[];
  meta: RakutenSearchMeta;
  excludedItems: ExcludedItem[];
}

// ─── Search params ────────────────────────────────────────────────────────────

export interface RakutenSearchParams {
  keyword?:          string;
  genreId?:          number;   // Rakuten genre ID — restricts results to this genre tree
  page?:             number;
  hits?:             number;
  market?:           string;   // normalization hint: sets product.market
  cat?:              string;   // normalization hint: sets product.cat
  includeLowSignal?: boolean;  // keep items with reviewCount < 3 or rating = 0
}

// ─── Name normalizer ──────────────────────────────────────────────────────────

const PROMO_PATTERNS: RegExp[] = [
  /最大\d+[%％]OFF/gi,
  /\d+[%％]OFF/gi,
  /ポイント\d+倍/g,
  /送料無料/g,
  /即納/g,
  /新品/g,
  /国内正規品/g,
  /クーポン/g,
  /セール/g,
  /楽天ランキング/g,
  /iphone/gi,
  /youtube/gi,
  /vlog/gi,
];

function normalizeName(raw: string): string {
  let name = raw;

  // Bracketed blocks【...】are almost always promotional — remove entirely
  name = name.replace(/【[^】]*】/g, " ");
  name = name.replace(/\[[^\]]*\]/g, " ");
  name = name.replace(/（[^）]*）/g, " ");
  name = name.replace(/\([^)]*\)/g, " ");

  for (const re of PROMO_PATTERNS) {
    name = name.replace(re, " ");
  }

  // Remove decoration characters
  name = name.replace(/[★☆◆◇●○■□▶▼◎※→←↑↓†‡]/g, " ");
  name = name.replace(/[/／｜・,，、。！!？?]/g, " ");

  name = name.replace(/\s+/g, " ").trim();

  // Truncate to 40 chars, prefer a word boundary
  if (name.length > 40) {
    const cut = name.slice(0, 40);
    const lastSpace = cut.lastIndexOf(" ");
    name = lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
  }

  return name || raw.slice(0, 40).trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeScore(rating: number, reviewCount: number): number {
  // Trend Score = reviewAverage × log10(reviewCount + 10) × 12, capped at 100
  return Math.min(100, Math.round(rating * Math.log10(reviewCount + 10) * 12));
}

function generateSpark(score: number): number[] {
  // Deterministic upward curve based on score — no Math.random()
  const base = score * 0.72;
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const wave = Math.sin(i * 1.4 + score * 0.05) * score * 0.03;
    return Math.round((base + (score - base) * t + wave) * 10) / 10;
  });
}

function scoreToColor(score: number): string {
  // Warm, muted oklch — stays within the paper palette family
  const l = (0.80 + (score / 100) * 0.06).toFixed(2);
  return `oklch(${l} 0.03 70)`;
}

function deriveAux(rating: number, reviewCount: number): string[] {
  const tags: string[] = [];
  if (rating >= 4.5) tags.push("HIGH RATED");
  if (reviewCount < 15) tags.push("NEW ENTRY");
  return tags;
}

// Rakuten doesn't expose a structured brand field.
// Attempt to extract from shopName as a rough proxy.
function extractBrand(shopName: string): string | undefined {
  // Keep the first "word cluster" before common suffixes like 楽天市場店 / 公式 / ショップ
  const cleaned = shopName
    .replace(/楽天市場店|楽天市場|公式ショップ|公式|ショップ|オンライン/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

// ─── Exclusion filter ────────────────────────────────────────────────────────

const EXCLUDE_KEYWORDS = [
  "ふるさと納税",
  "中古",
  "used",
  "レンタル",
  "訳あり",
  "ジャンク",
  "互換",
  "代替",
  "非純正",
  "汎用",
  "福袋",
  "セット販売のみ",
  "ケースのみ",
  "保護フィルム",
  "延長保証",
  "保証のみ",
  "修理",
  "部品取り",
  "空箱",
  "箱のみ",
  "説明書",
  "マニュアル",
];

// Returns exclusion reason string if item should be excluded, otherwise null.
function excludedByKeyword(raw: RakutenItemRaw): string | null {
  const target = `${raw.itemName} ${raw.shopName}`.toLowerCase();
  for (const kw of EXCLUDE_KEYWORDS) {
    if (target.includes(kw.toLowerCase())) return `excluded_keyword: ${kw}`;
  }
  return null;
}

function isLowSignal(raw: RakutenItemRaw): boolean {
  return raw.reviewCount < 3 || raw.reviewAverage === 0;
}

// ─── Image URL normalizer ─────────────────────────────────────────────────────

// Rakuten thumbnail URLs carry ?_ex=128x128 (or 64x64 etc.) that downsample
// the image at the CDN. Removing the param serves the original, larger image.
function normalizeImageUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    url.searchParams.delete("_ex");
    const s = url.toString();
    // Remove trailing lone "?" left after deletion
    return s.endsWith("?") ? s.slice(0, -1) : s;
  } catch {
    return raw.replace(/[?&]_ex=\d+x\d+/g, "").replace(/[?&]$/, "") || undefined;
  }
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeItem(
  raw: RakutenItemRaw,
  market: string,
  cat: string
): RakutenProduct {
  const score = computeScore(raw.reviewAverage, raw.reviewCount);
  // Prefer mediumImageUrls; strip the _ex downsampling param from both sources
  const imageUrl =
    normalizeImageUrl(raw.mediumImageUrls?.[0]?.imageUrl) ??
    normalizeImageUrl(raw.smallImageUrls?.[0]?.imageUrl);

  return {
    id: `rakuten_${raw.itemCode}`,
    name: normalizeName(raw.itemName),
    brand: extractBrand(raw.shopName),
    market,
    cat,
    score,
    scoreChg: 0,
    scoreChg24h: 0,
    reviewsDelta: 0,
    reviewsVelocity: 0,
    rating: raw.reviewAverage,
    ratingChg: 0,
    rankUp: 0,
    isNew: raw.reviewCount < 15,
    priceChg: 0,
    price: raw.itemPrice,
    imageUrl,
    itemUrl: raw.itemUrl,
    source: "rakuten",
    rawReviewCount: raw.reviewCount,
    aux: deriveAux(raw.reviewAverage, raw.reviewCount),
    spark: generateSpark(score),
    color: scoreToColor(score),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchRakuten(
  params: RakutenSearchParams
): Promise<RakutenSearchResult> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey     = process.env.RAKUTEN_ACCESS_KEY?.trim();
  const affiliateId   = process.env.RAKUTEN_AFFILIATE_ID?.trim();

  const missing = [
    !applicationId && "RAKUTEN_APPLICATION_ID",
    !accessKey     && "RAKUTEN_ACCESS_KEY",
  ].filter(Boolean).join(", ");
  if (missing) {
    throw new Error(`${missing} is not set. Add it to .env.local.`);
  }

  const market          = params.market ?? "beauty";
  const cat             = params.cat    ?? "unknown";
  const includeLowSignal = params.includeLowSignal ?? false;

  const referer = (process.env.RAKUTEN_REFERER ?? "").trim() || "http://localhost:3002";

  const query = new URLSearchParams({
    applicationId: applicationId!,
    accessKey:     accessKey!,
    ...(affiliateId ? { affiliateId } : {}),
    ...(params.keyword ? { keyword: params.keyword } : {}),
    ...(params.genreId != null ? { genreId: String(params.genreId) } : {}),
    hits:   String(Math.min(params.hits ?? 10, 30)), // Rakuten max = 30
    page:   String(params.page  ?? 1),
    format: "json",
  });

  const res = await fetch(`${RAKUTEN_API_URL}?${query.toString()}`, {
    headers: {
      "Origin":     referer,
      "Referer":    referer,
      "User-Agent": "GadgetHeat/0.1",
    },
    // ISR-style: re-validate every 10 minutes server-side
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`Rakuten API HTTP error: ${res.status} — ${body}`);
  }

  const data: RakutenApiResponse = await res.json();

  if (data.error) {
    throw new Error(`Rakuten API error: ${data.error} — ${data.error_description}`);
  }

  const items: RakutenProduct[] = [];
  const excludedItems: ExcludedItem[] = [];

  for (const { Item } of data.Items ?? []) {
    const kwReason = excludedByKeyword(Item);
    if (kwReason) {
      excludedItems.push({
        name:           Item.itemName.slice(0, 60),
        reason:         kwReason,
        rawReviewCount: Item.reviewCount,
        rating:         Item.reviewAverage,
        price:          Item.itemPrice,
      });
      continue;
    }
    if (isLowSignal(Item) && !includeLowSignal) {
      excludedItems.push({
        name:           Item.itemName.slice(0, 60),
        reason:         `low_signal: reviewCount=${Item.reviewCount} rating=${Item.reviewAverage}`,
        rawReviewCount: Item.reviewCount,
        rating:         Item.reviewAverage,
        price:          Item.itemPrice,
      });
      continue;
    }
    items.push(normalizeItem(Item, market, cat));
  }

  return {
    items,
    meta: {
      count:     data.count     ?? 0,
      page:      data.page      ?? 1,
      pageCount: data.pageCount ?? 0,
    },
    excludedItems,
  };
}
