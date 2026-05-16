// Search seeds for Rakuten API validation.
// One seed = one keyword + the Gadget Heat market/cat it belongs to.
// Used by /api/rakuten/seed-test before wiring live data to the UI.

export interface SearchSeed {
  keyword: string;
  cat: string;
}

export interface MarketSeeds {
  marketId: string;
  marketName: string;
  seeds: SearchSeed[];
}

export const SEARCH_SEEDS: MarketSeeds[] = [
  {
    marketId: "audio",
    marketName: "Creator Audio",
    seeds: [
      { keyword: "DJI Mic",               cat: "Wireless Mic" },
      { keyword: "Sony ECM マイク",        cat: "Camera Microphone" },
      { keyword: "RODE ワイヤレスマイク",  cat: "Wireless Mic" },
      { keyword: "Hollyland Lark",         cat: "Wireless Mic" },
      { keyword: "Sennheiser MKE",         cat: "Shotgun Mic" },
      { keyword: "オーディオインターフェース", cat: "Audio Interface" },
    ],
  },
  {
    marketId: "storage",
    marketName: "Creator Storage",
    seeds: [
      { keyword: "CFexpress Type B",       cat: "CFexpress" },
      { keyword: "CFexpress Type A",       cat: "CFexpress" },
      { keyword: "SDカード V90",           cat: "SD Card" },
      { keyword: "Portable SSD",           cat: "Portable SSD" },
      { keyword: "Samsung T9 SSD",         cat: "Portable SSD" },
      { keyword: "NAS Synology",           cat: "NAS" },
    ],
  },
  {
    marketId: "computing",
    marketName: "Creator Computing",
    seeds: [
      { keyword: "MacBook Pro M4",         cat: "MacBook" },
      { keyword: "iPad Pro M4",            cat: "iPad" },
      { keyword: "Thunderbolt Dock",       cat: "Thunderbolt Dock" },
      { keyword: "Mini PC クリエイター",   cat: "Mini PC" },
      { keyword: "キャプチャーカード 4K",  cat: "Capture Device" },
    ],
  },
  {
    marketId: "support",
    marketName: "Camera Support",
    seeds: [
      { keyword: "カメラ 三脚 カーボン",  cat: "Tripod" },
      { keyword: "カメラ ジンバル",        cat: "Gimbal" },
      { keyword: "DJI RS",                 cat: "Gimbal" },
      { keyword: "SmallRig ケージ",        cat: "Cage" },
      { keyword: "Ulanzi カメラ",          cat: "Grip" },
    ],
  },
  {
    marketId: "power",
    marketName: "Camera Power",
    seeds: [
      { keyword: "NP-FZ100 バッテリー",    cat: "Battery" },
      { keyword: "カメラ バッテリー 互換", cat: "Battery" },
      { keyword: "NP-F カプラー",          cat: "Coupler" },
      { keyword: "USB-C PD モバイルバッテリー", cat: "Power Bank" },
    ],
  },
  {
    marketId: "lighting",
    marketName: "Creator Lighting",
    seeds: [
      { keyword: "LED ビデオライト",        cat: "LED Light" },
      { keyword: "Aputure ライト",          cat: "LED Light" },
      { keyword: "Amaran",                  cat: "LED Light" },
      { keyword: "Godox LED パネル",        cat: "LED Light" },
      { keyword: "オンカメラ ライト",       cat: "On-Camera Light" },
    ],
  },
  {
    marketId: "monitor",
    marketName: "Creator Monitor",
    seeds: [
      { keyword: "カメラ 外部モニター",     cat: "Field Monitor" },
      { keyword: "Atomos モニター",         cat: "Camera Monitor" },
      { keyword: "Feelworld モニター",      cat: "Field Monitor" },
      { keyword: "4K クリエイターモニター", cat: "Creator Monitor" },
    ],
  },
  {
    marketId: "streaming",
    marketName: "Streaming Gear",
    seeds: [
      { keyword: "キャプチャーボード",      cat: "Capture Card" },
      { keyword: "Elgato Stream Deck",      cat: "Stream Deck" },
      { keyword: "配信用ミキサー",          cat: "Streaming Mixer" },
      { keyword: "Webカメラ 4K",            cat: "Webcam" },
    ],
  },
];

// Lookup helper: find seeds by marketId
export function seedsForMarket(marketId: string): MarketSeeds | undefined {
  return SEARCH_SEEDS.find((m) => m.marketId === marketId);
}
