// Best Buy adapter — EN market product source.
// Server-only. Never import from client components.
//
// Gadget Heat EN market vision:
//   - Product catalog and pricing data from Best Buy Products API
//   - Search keywords will differ from JP (no Japanese terms)
//   - Trend Score formula is the same; review/rating signals differ by market
//
// imageOverrides.ts applies across all sources — Best Buy products
// can also use curated override images (Amazon, official, B&H).

import type { MarketProductSource } from "./types";

export const bestBuySource: MarketProductSource = {
  id: "bestbuy",

  async searchProducts() {
    // TODO: Implement Best Buy Products API
    //
    // Endpoint: https://api.bestbuy.com/v1/products(search=QUERY)
    // Auth: apiKey query param — set BESTBUY_API_KEY in .env.local
    // Format: json
    //
    // Useful fields: sku, name, manufacturer, regularPrice, salePrice,
    //                customerReviewCount, customerReviewAverage, images[].href
    //
    // Normalization: apply same Trend Score formula as Rakuten adapter.
    // Set source: "bestbuy" on returned Product objects.
    return [];
  },
};
