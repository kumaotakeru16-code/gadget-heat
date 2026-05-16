import { Product } from "@/data/products";
import { ALL_MARKET_IDS } from "@/data/markets";

export function applyMarketFilter(
  products: Product[],
  marketId: string,
  subcat: string | null
): Product[] {
  let arr = products;
  if (marketId === "all") {
    // Restrict ALL Markets to active + experimental; exclude "later" markets.
    arr = arr.filter((p) => ALL_MARKET_IDS.includes(p.market));
  } else {
    arr = arr.filter((p) => p.market === marketId);
  }
  if (subcat) arr = arr.filter((p) => p.cat === subcat);
  return [...arr].sort((a, b) => b.score - a.score);
}
