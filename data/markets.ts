// Market status controls how each market appears in the Drawer and
// whether it is included in ALL Markets aggregation.
//
//   active       — Rakuten MVP: actively displayed and validated
//   experimental — displayed but data quality still being verified
//   later        — Coming Later in Drawer, excluded from ALL Markets feed

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
    tagline: "Across Life Gadget Markets",
    blurb: "Life Gadget 全体で、今、市場の熱量が高まっている製品。",
    subcats: [],
    status: "active",
  },
  {
    id: "beauty",
    name: "Beauty Tech",
    short: "BEAUTY",
    tagline: "Look & Feel Better",
    blurb: "ドライヤー、美顔器、脱毛器。毎日の美容を変えるガジェット市場。",
    subcats: ["Hair Dryer", "Hair Iron", "Face Care", "EMS", "Scalp Care", "Hair Removal"],
    status: "active",
  },
  {
    id: "kitchen",
    name: "Kitchen Tech",
    short: "KITCHEN",
    tagline: "Cook Smarter",
    blurb: "ノンフライヤー、自動調理鍋、コーヒーメーカー。キッチンを進化させる市場。",
    subcats: ["Air Fryer", "Auto Cooker", "Coffee Maker", "Soda Maker", "Vacuum Sealer", "Electric Mill"],
    status: "active",
  },
  {
    id: "health",
    name: "Health Tech",
    short: "HEALTH",
    tagline: "Feel Good Every Day",
    blurb: "マッサージガン、スマート体重計、EMSデバイス。健康習慣を支えるガジェット市場。",
    subcats: ["Massage Gun", "Foot Massager", "Smart Scale", "Neck Care", "EMS", "Sleep Gadget"],
    status: "active",
  },
  {
    id: "parenting",
    name: "Parenting Gadgets",
    short: "PARENTING",
    tagline: "Raise with Ease",
    blurb: "ベビーモニター、授乳グッズ、哺乳瓶ウォーマー。子育てを便利にする市場。",
    subcats: ["Baby Monitor", "Bottle Warmer", "Baby Scale", "Nursing Gadget", "Baby Humidifier"],
    status: "active",
  },
  {
    id: "desk",
    name: "Desk Gadgets",
    short: "DESK",
    tagline: "Work Better",
    blurb: "デスクライト、USBハブ、ワイヤレス充電。デスク環境を整えるガジェット市場。",
    subcats: ["Desk Light", "USB-C Hub", "Wireless Charger", "Keyboard", "Standing Desk", "Gadget Organizer"],
    status: "active",
  },
  {
    id: "cleaning",
    name: "Home & Cleaning",
    short: "HOME",
    tagline: "Live Cleaner",
    blurb: "ロボット掃除機、空気清浄機、除湿機。清潔で快適な暮らしを作る市場。",
    subcats: ["Robot Vacuum", "Handy Vacuum", "Air Purifier", "Dehumidifier", "Smart Lighting"],
    status: "active",
  },
  {
    id: "outdoor",
    name: "Outdoor & Emergency",
    short: "OUTDOOR",
    tagline: "Ready for Anything",
    blurb: "ポータブル電源、防災ラジオ、ソーラー充電。アウトドアと防災を支える市場。",
    subcats: ["Portable Power", "LED Lantern", "Emergency Radio", "Solar Charger", "Mini Generator"],
    status: "active",
  },
];

export const ALL_MARKET = MARKETS[0];

// Market IDs included in the ALL Markets aggregation feed.
// "later" markets are excluded until their data quality is validated.
export const ALL_MARKET_IDS = MARKETS
  .filter((m) => m.id !== "all" && m.status !== "later")
  .map((m) => m.id);

// Markets served by live Rakuten data.
// Derived from MARKETS so adding a new non-"later" market automatically
// includes it in the live data sweep (categoryFetch).
export const RAKUTEN_ACTIVE_MARKET_IDS = MARKETS
  .filter((m) => m.id !== "all" && m.status !== "later")
  .map((m) => m.id);

export function marketById(id: string): Market {
  return MARKETS.find((m) => m.id === id) ?? ALL_MARKET;
}
