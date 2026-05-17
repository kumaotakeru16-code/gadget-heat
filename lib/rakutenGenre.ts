// Rakuten IchibaGenre Search API + IchibaItem Ranking API helpers.
// Server-only. Never import from client components.

import "server-only";

const GENRE_API_URL   = "https://app.rakuten.co.jp/services/api/IchibaGenre/Search/20120723";
const RANKING_API_URL = "https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20170628";

// ─── Genre API ────────────────────────────────────────────────────────────────

export interface RakutenGenreItem {
  genreId:    number;
  genreName:  string;
  genreLevel: number;
}

export interface RakutenGenreResult {
  current:  RakutenGenreItem;
  parents:  RakutenGenreItem[];
  children: RakutenGenreItem[];
}

interface RakutenGenreRaw {
  genreId:    number | string;
  genreName:  string;
  genreLevel: number | string;
}

interface RakutenGenreApiResponse {
  current?:  { genreInformationArray: { current: RakutenGenreRaw }[] };
  parents?:  { genreInformationArray: { parent:  RakutenGenreRaw }[] };
  children?: { genreInformationArray: { child:   RakutenGenreRaw }[] };
  error?:    string;
  error_description?: string;
}

function coerceGenreItem(raw: RakutenGenreRaw): RakutenGenreItem {
  return {
    genreId:    Number(raw.genreId),
    genreName:  raw.genreName,
    genreLevel: Number(raw.genreLevel),
  };
}

/**
 * Fetches a genre node and its immediate children from the Rakuten genre tree.
 * Use genreId=0 to start at the root.
 *
 * The genre IDs returned by children can be used:
 *   - in marketCategories.ts as `genreId` on a CategoryEntry
 *   - in Item Search API to narrow results to that genre
 *   - recursively here to explore deeper levels
 */
export async function fetchRakutenGenre(
  genreId: number = 0
): Promise<RakutenGenreResult> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  if (!applicationId) {
    throw new Error("RAKUTEN_APPLICATION_ID is not set");
  }

  const query = new URLSearchParams({
    applicationId,
    genreId:      String(genreId),
    genrePathType: "1",  // include parent path
    format:       "json",
  });

  const res = await fetch(`${GENRE_API_URL}?${query.toString()}`, {
    next: { revalidate: 3600 }, // genre tree changes rarely
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Rakuten Genre API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: RakutenGenreApiResponse = await res.json();

  if (data.error) {
    throw new Error(`Rakuten Genre API error: ${data.error} — ${data.error_description}`);
  }

  // The response wraps items in arrays — normalise defensively
  const currentRaw = data.current?.genreInformationArray?.[0]?.current;
  const current: RakutenGenreItem = currentRaw
    ? coerceGenreItem(currentRaw)
    : { genreId, genreName: `Genre ${genreId}`, genreLevel: -1 };

  const parents: RakutenGenreItem[] =
    (data.parents?.genreInformationArray ?? []).map((p) => coerceGenreItem(p.parent));

  const children: RakutenGenreItem[] =
    (data.children?.genreInformationArray ?? []).map((c) => coerceGenreItem(c.child));

  return { current, parents, children };
}

// ─── Ranking API ──────────────────────────────────────────────────────────────

export interface RakutenRankingParams {
  genreId?: number;
  hits?:    number;  // 1–30
  page?:    number;
  market?:  string;  // normalization hint: sets product.market
  cat?:     string;  // normalization hint: sets product.cat
}

export interface RakutenRankingItem {
  id:             string;
  name:           string;
  brand?:         string;
  market:         string;
  cat:            string;
  price:          number;
  rating:         number;
  rawReviewCount: number;
  imageUrl?:      string;
  itemUrl:        string;
  rank:           number;   // 1-based ranking position
}

interface RakutenRankingApiResponse {
  Items?:    { Item: RakutenItemRankingRaw }[];
  count?:    number;
  page?:     number;
  pageCount?: number;
  error?:    string;
  error_description?: string;
}

interface RakutenItemRankingRaw {
  rank:          number;
  itemCode:      string;
  itemName:      string;
  itemPrice:     number;
  itemUrl:       string;
  reviewAverage: number;
  reviewCount:   number;
  smallImageUrls:  { imageUrl: string }[];
  mediumImageUrls: { imageUrl: string }[];
  shopName:      string;
}

/**
 * Fetches Rakuten's top-selling items in a genre by purchase count.
 * Useful as a heat-signal supplement: items trending by sales, not just reviews.
 */
export async function fetchRakutenRanking(
  params: RakutenRankingParams = {}
): Promise<RakutenRankingItem[]> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey     = process.env.RAKUTEN_ACCESS_KEY?.trim();
  if (!applicationId || !accessKey) {
    throw new Error("RAKUTEN_APPLICATION_ID or RAKUTEN_ACCESS_KEY is not set");
  }

  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID?.trim();
  const referer     = (process.env.RAKUTEN_REFERER ?? "").trim() || "http://localhost:3002";

  const query = new URLSearchParams({
    applicationId,
    accessKey,
    ...(affiliateId                ? { affiliateId }                     : {}),
    ...(params.genreId !== undefined ? { genreId: String(params.genreId) } : {}),
    hits:   String(Math.min(params.hits ?? 30, 30)),
    page:   String(params.page   ?? 1),
    format: "json",
  });

  const res = await fetch(`${RANKING_API_URL}?${query.toString()}`, {
    headers: { Origin: referer, Referer: referer, "User-Agent": "GadgetHeat/0.1" },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Rakuten Ranking API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: RakutenRankingApiResponse = await res.json();

  if (data.error) {
    throw new Error(`Rakuten Ranking API error: ${data.error} — ${data.error_description}`);
  }

  const market = params.market ?? "unknown";
  const cat    = params.cat    ?? "Ranking";

  return (data.Items ?? []).map(({ Item }) => {
    const imageUrl =
      Item.mediumImageUrls?.[0]?.imageUrl ??
      Item.smallImageUrls?.[0]?.imageUrl;
    return {
      id:             `rakuten_${Item.itemCode}`,
      name:           Item.itemName.slice(0, 80),
      brand:          Item.shopName,
      market,
      cat,
      price:          Item.itemPrice,
      rating:         Item.reviewAverage,
      rawReviewCount: Item.reviewCount,
      imageUrl,
      itemUrl:        Item.itemUrl,
      rank:           Item.rank,
    };
  });
}
