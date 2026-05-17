// Market status controls how each market appears in the Drawer and
// whether it is included in ALL Markets aggregation.
//
//   active       — Rakuten MVP: actively displayed and validated
//   experimental — displayed but data quality still being verified
//   later        — Coming Later in Drawer, excluded from ALL Markets feed
//                  (Creator Storage: deferred not because it's outside Gadget Heat's
//                   vision, but because price/capacity comparisons dominate Rakuten
//                   search results, making it unsuitable for early world-view validation)

export type MarketStatus = "active" | "experimental" | "later";

export interface Market {
  id: string;
  name: string;
  short: string;
  tagline: string;
  blurb: string;
  subcats: string[];
  status: MarketStatus;
}

export const MARKETS: Market[] = [
  {
    id: "all",
    name: "ALL Markets",
    short: "ALL",
    tagline: "Across Creator Markets",
    blurb:
      "Creator Gear 全体で、今、市場の熱量が高まっている製品。",
    subcats: [],
    status: "active",
  },
  {
    id: "audio",
    name: "Creator Audio",
    short: "AUDIO",
    tagline: "Capture & Sound",
    blurb:
      "マイク、オーディオインターフェース、撮影現場の音を捉える市場。",
    subcats: [
      "Wireless Mic",
      "Camera Microphone",
      "Shotgun Mic",
      "Lavalier Mic",
      "Audio Interface",
    ],
    status: "active",
  },
  {
    id: "storage",
    name: "Creator Storage",
    short: "STORAGE",
    tagline: "Capture & Archive",
    blurb:
      "CFexpress、SD、SSD、NAS。撮影データを記録・保存する市場。",
    subcats: ["CFexpress", "SD Card", "Portable SSD", "Card Reader", "NAS"],
    status: "later",
  },
  {
    id: "computing",
    name: "Creator Computing",
    short: "COMPUTING",
    tagline: "Edit & Deliver",
    blurb:
      "MacBook、iPad、Dock。撮ったものを編集して届けるための市場。",
    subcats: [
      "MacBook",
      "iPad",
      "Creator Laptop",
      "Mini PC",
      "Thunderbolt Dock",
      "Capture Device",
    ],
    status: "experimental",
  },
  {
    id: "support",
    name: "Camera Support",
    short: "SUPPORT",
    tagline: "Hold & Move",
    blurb:
      "カメラを支え、保持し、動かす。三脚・ジンバル・ケージ・リグの市場。",
    subcats: ["Tripod", "Gimbal", "Grip", "Cage", "Rig", "Mount"],
    status: "active",
  },
  {
    id: "power",
    name: "Camera Power",
    short: "POWER",
    tagline: "Keep Rolling",
    blurb:
      "撮影を止めないための電源系。バッテリー、チャージャー、カプラー。",
    subcats: ["Battery", "Charger", "Coupler", "Power Bank"],
    status: "experimental",
  },
  {
    id: "lighting",
    name: "Creator Lighting",
    short: "LIGHTING",
    tagline: "Shape the Light",
    blurb: "LEDからオンカメラライトまで、光をコントロールする市場。",
    subcats: ["LED Light", "On-Camera Light", "Light Stand", "Video Light"],
    status: "experimental",
  },
  {
    id: "monitor",
    name: "Creator Monitor",
    short: "MONITOR",
    tagline: "See What You Capture",
    blurb:
      "カメラモニター、編集モニター。映像を確認する市場。",
    subcats: ["Camera Monitor", "Creator Monitor", "Field Monitor"],
    status: "experimental",
  },
  {
    id: "streaming",
    name: "Streaming Gear",
    short: "STREAM",
    tagline: "Broadcast Stack",
    blurb:
      "キャプチャー、ミキサー、Webcam。配信のための機材市場。",
    subcats: ["Capture Card", "Streaming Mixer", "Webcam", "Stream Deck"],
    status: "experimental",
  },
];

export const ALL_MARKET = MARKETS[0];

// Market IDs included in the ALL Markets aggregation feed.
// "later" markets are excluded until their data quality is validated.
export const ALL_MARKET_IDS = MARKETS
  .filter((m) => m.id !== "all" && m.status !== "later")
  .map((m) => m.id);

// Markets with validated live data quality in the JP MVP (Rakuten source).
// Expand when additional markets are validated.
export const RAKUTEN_ACTIVE_MARKET_IDS = ["audio", "support"];

export function marketById(id: string): Market {
  return MARKETS.find((m) => m.id === id) ?? ALL_MARKET;
}
