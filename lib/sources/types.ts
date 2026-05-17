import type { Product } from "@/data/products";

// Generic search parameters shared across all sources.
// market/cat are normalization hints; sources may ignore them if not applicable.
// keyword and genreId are both optional: at least one should be provided.
export interface SourceSearchParams {
  keyword?:  string;  // search term; omit for genre-only search
  market:    string;
  cat:       string;
  genreId?:  number;  // source-specific genre/category ID (Rakuten: IchibaGenre ID)
  hits?:     number;
  page?:     number;
}

// All data sources implement this interface.
// Each source is responsible for returning fully normalized Product[] —
// no further transformation is required by the caller.
export interface MarketProductSource {
  id: string;
  searchProducts(params: SourceSearchParams): Promise<Product[]>;
}
