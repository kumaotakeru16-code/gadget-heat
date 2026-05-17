// Rakuten Ichiba adapter — JP market product source.
// Server-only. Never import from client components.

import { searchRakuten } from "@/lib/rakuten";
import type { RakutenProduct } from "@/lib/rakuten";
import type { Product } from "@/data/products";
import type { MarketProductSource, SourceSearchParams } from "./types";

function toProduct(p: RakutenProduct): Product {
  return {
    id:              p.id,
    name:            p.name,
    brand:           p.brand ?? "",
    market:          p.market,
    cat:             p.cat,
    score:           p.score,
    scoreChg:        p.scoreChg,
    scoreChg24h:     p.scoreChg24h,
    reviewsDelta:    p.reviewsDelta,
    reviewsVelocity: p.reviewsVelocity,
    rating:          p.rating,
    ratingChg:       p.ratingChg,
    rankUp:          p.rankUp,
    isNew:           p.isNew,
    priceChg:        p.priceChg,
    price:           p.price,
    aux:             p.aux,
    spark:           p.spark,
    color:           p.color,
    imageUrl:        p.imageUrl,
    itemUrl:         p.itemUrl,
    rawReviewCount:  p.rawReviewCount,
    source:          "rakuten",
  };
}

export const rakutenSource: MarketProductSource = {
  id: "rakuten",

  async searchProducts(params: SourceSearchParams): Promise<Product[]> {
    const result = await searchRakuten({
      keyword: params.keyword,
      market:  params.market,
      cat:     params.cat,
      hits:    params.hits ?? 10,
      page:    params.page  ?? 1,
    });
    return result.items.map(toProduct);
  },
};
