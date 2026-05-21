// Market status controls how each market appears in the Drawer and
// whether it is included in ALL Markets aggregation.
//
//   active       — Rakuten MVP: actively displayed and validated
//   experimental — displayed under "Beta Markets"; data quality still being verified
//   later        — Coming Later in Drawer; excluded from ALL Markets feed and keyword sweep

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
  // ─── ALL (aggregate) ───────────────────────────────────────────────────────
  {
    id:      "all",
    name:    "ALL Markets",
    short:   "ALL",
    tagline: "Across Life Item Markets",
    blurb:   "美容・キッチン・掃除・アウトドア・日用品。暮らしを改善するアイテム全体で、今動いているものを可視化。",
    subcats: [],
    status:  "active",
  },

  // ─── Active markets (楽天と相性が良い領域) ──────────────────────────────────

  {
    id:      "beauty",
    name:    "Beauty Tech",
    short:   "BEAUTY",
    tagline: "Look & Feel Better",
    blurb:   "ドライヤー、美顔器、脱毛器、電動歯ブラシ。毎日の美容ルーティンを変えるアイテム市場。",
    subcats: ["Hair Dryer", "Hair Iron", "Face Care", "Hair Removal", "Scalp Care", "Electric Toothbrush", "EMS Beauty"],
    status:  "active",
  },
  {
    id:      "kitchen",
    name:    "Kitchen Tech",
    short:   "KITCHEN",
    tagline: "Cook Smarter",
    blurb:   "ノンフライヤー、全自動コーヒーメーカー、炭酸水メーカー。キッチンを進化させるアイテム市場。",
    subcats: ["Air Fryer", "Coffee Maker", "Soda Maker", "Auto Cooker", "Electric Mill", "Vacuum Sealer", "Kitchen Scale"],
    status:  "active",
  },
  {
    id:      "cleaning",
    name:    "Home & Cleaning",
    short:   "HOME",
    tagline: "Live Cleaner",
    blurb:   "ロボット掃除機、空気清浄機、布団クリーナー。清潔で快適な暮らしを作るアイテム市場。",
    subcats: ["Robot Vacuum", "Stick Vacuum", "Air Purifier", "Dehumidifier", "Futon Cleaner", "Steam Cleaner", "Smart Lighting"],
    status:  "active",
  },
  {
    id:      "outdoor",
    name:    "Outdoor & Emergency",
    short:   "OUTDOOR",
    tagline: "Ready for Anything",
    blurb:   "ポータブル電源、防災ラジオ、キャンプ扇風機。アウトドアと非常時に備えるアイテム市場。",
    subcats: ["Portable Power", "LED Lantern", "Emergency Radio", "Solar Panel", "Camping Fan", "Cooler Box"],
    status:  "active",
  },
  {
    id:      "daily",
    name:    "Daily Utility",
    short:   "DAILY",
    tagline: "Small Things, Big Difference",
    blurb:   "収納、洗濯、掃除グッズ、節電、防災用品。ガジェットではないけれど、暮らしを少し便利にする日用品市場。",
    subcats: ["Storage", "Laundry", "Cleaning Tools", "Kitchen Utility", "Energy Saving", "Winter Goods", "Disaster Goods", "Bathroom Utility"],
    status:  "active",
  },

  // ─── Experimental (データ品質を検証中) ─────────────────────────────────────

  {
    id:      "health",
    name:    "Health & Wellness",
    short:   "HEALTH",
    tagline: "Feel Good Every Day",
    blurb:   "マッサージガン、フットマッサージャー、スマート体重計。健康習慣を支えるアイテム市場（ベータ）。",
    subcats: ["Massage Gun", "Foot Massager", "Smart Scale", "Neck Care", "EMS Body", "Sleep Gadget"],
    status:  "experimental",
  },

  // ─── Later (Coming Later — 楽天でのシグナルが弱い、または検討中) ──────────

  {
    id:      "parenting",
    name:    "Parenting Gadgets",
    short:   "PARENTING",
    tagline: "Raise with Ease",
    blurb:   "ベビーモニター、授乳グッズ、哺乳瓶ウォーマー。子育てを便利にするアイテム市場（準備中）。",
    subcats: ["Baby Monitor", "Bottle Warmer", "Baby Scale", "Nursing Gadget", "Baby Humidifier"],
    status:  "later",
  },
  {
    id:      "desk",
    name:    "Desk Gadgets",
    short:   "DESK",
    tagline: "Work Better",
    blurb:   "デスクライト、USBハブ、ワイヤレス充電。デスク環境を整えるガジェット市場（準備中）。",
    subcats: ["Desk Light", "USB-C Hub", "Wireless Charger", "Keyboard", "Standing Desk", "Gadget Organizer"],
    status:  "later",
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
