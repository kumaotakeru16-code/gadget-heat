import type { Product } from "@/data/products";

export interface SocialCandidate {
  product:     Product;
  shortReason: string;
  rank:        number;
}
