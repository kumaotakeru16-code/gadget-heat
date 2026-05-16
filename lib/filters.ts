import { Product } from "@/data/products";

export function applyMarketFilter(
  products: Product[],
  marketId: string,
  subcat: string | null
): Product[] {
  let arr = products;
  if (marketId !== "all") arr = arr.filter((p) => p.market === marketId);
  if (subcat) arr = arr.filter((p) => p.cat === subcat);
  return [...arr].sort((a, b) => b.score - a.score);
}
