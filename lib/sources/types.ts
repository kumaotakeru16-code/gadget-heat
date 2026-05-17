import type { Product } from "@/data/products";

// Generic search parameters shared across all sources.
// market/cat are normalization hints; sources may ignore them if not applicable.
export interface SourceSearchParams {
  keyword: string;
  market: string;
  cat: string;
  hits?: number;
  page?: number;
}

// All data sources implement this interface.
// Each source is responsible for returning fully normalized Product[] —
// no further transformation is required by the caller.
export interface MarketProductSource {
  id: string;
  searchProducts(params: SourceSearchParams): Promise<Product[]>;
}
