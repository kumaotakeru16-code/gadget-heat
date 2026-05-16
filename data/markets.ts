export interface Market {
  id: string;
  name: string;
  short: string;
  tagline: string;
  blurb: string;
  subcats: string[];
  later?: boolean; // excluded from MVP; shown separately or hidden
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
  },
  {
    id: "storage",
    name: "Creator Storage",
    short: "STORAGE",
    tagline: "Capture & Archive",
    blurb:
      "CFexpress、SD、SSD、NAS。撮影データを記録・保存する市場。",
    subcats: ["CFexpress", "SD Card", "Portable SSD", "Card Reader", "NAS"],
    later: true,
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
  },
  {
    id: "support",
    name: "Camera Support",
    short: "SUPPORT",
    tagline: "Hold & Move",
    blurb:
      "カメラを支え、保持し、動かす。三脚・ジンバル・ケージ・リグの市場。",
    subcats: ["Tripod", "Gimbal", "Grip", "Cage", "Rig", "Mount"],
  },
  {
    id: "power",
    name: "Camera Power",
    short: "POWER",
    tagline: "Keep Rolling",
    blurb:
      "撮影を止めないための電源系。バッテリー、チャージャー、カプラー。",
    subcats: ["Battery", "Charger", "Coupler", "Power Bank"],
  },
  {
    id: "lighting",
    name: "Creator Lighting",
    short: "LIGHTING",
    tagline: "Shape the Light",
    blurb: "LEDからオンカメラライトまで、光をコントロールする市場。",
    subcats: ["LED Light", "On-Camera Light", "Light Stand", "Video Light"],
  },
  {
    id: "monitor",
    name: "Creator Monitor",
    short: "MONITOR",
    tagline: "See What You Capture",
    blurb:
      "カメラモニター、編集モニター。映像を確認する市場。",
    subcats: ["Camera Monitor", "Creator Monitor", "Field Monitor"],
  },
  {
    id: "streaming",
    name: "Streaming Gear",
    short: "STREAM",
    tagline: "Broadcast Stack",
    blurb:
      "キャプチャー、ミキサー、Webcam。配信のための機材市場。",
    subcats: ["Capture Card", "Streaming Mixer", "Webcam", "Stream Deck"],
  },
];

export const ALL_MARKET = MARKETS[0];

export function marketById(id: string): Market {
  return MARKETS.find((m) => m.id === id) ?? ALL_MARKET;
}
