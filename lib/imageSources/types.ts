export type ImageCandidateSource = "amazon" | "official";

export interface ImageCandidate {
  productKey: string;
  query: string;
  title: string;
  imageUrl: string;
  source: ImageCandidateSource;
  sourceUrl?: string;
  asin?: string;
  confidence: number; // 0.0–1.0
  reason?: string;    // human-readable explanation of confidence score
}
