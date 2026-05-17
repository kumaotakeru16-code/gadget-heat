// Gadget Heat data source architecture:
//
//   JP market validation → Rakuten  (レビュー・評価・価格データ)
//   EN market validation → Best Buy (EN product catalog, coming later)
//
// Image overrides (data/imageOverrides.ts) are source-agnostic and apply
// to products from any source.

import type { LocaleCode } from "@/data/locales";
import type { MarketProductSource } from "./types";
import { rakutenSource } from "./rakuten";
import { bestBuySource } from "./bestbuy";

export type { MarketProductSource, SourceSearchParams } from "./types";
export { rakutenSource } from "./rakuten";
export { bestBuySource } from "./bestbuy";

const LOCALE_SOURCE_MAP: Record<LocaleCode, MarketProductSource> = {
  jp: rakutenSource,
  en: bestBuySource,
};

export function sourceForLocale(locale: LocaleCode): MarketProductSource {
  return LOCALE_SOURCE_MAP[locale] ?? rakutenSource;
}
