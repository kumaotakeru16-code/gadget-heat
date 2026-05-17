// Per-market keyword definitions for the category-sweep fetch strategy.
//
// Design:
//   - Each entry is one keyword + its Gadget Heat cat label.
//   - `pages` controls how many Rakuten result pages to fetch (default: 1, max: 3).
//     Use pages: 2 only for the highest-signal keywords in each market.
//   - Keywords are intentionally specific: generic terms (e.g. "マイク") surface too
//     much noise; branded + functional phrases yield better creator-gear signal.
//
// Adding a market: append a new entry to MARKET_CATEGORIES.
// Category sweep is driven entirely by this file — no other config needed.

export interface CategoryEntry {
  keyword: string;
  cat:     string;
  pages?:  number; // pages to fetch (default 1, Rakuten max 30 items/page)
}

export interface MarketCategory {
  marketId:   string;
  categories: CategoryEntry[];
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  // ─────────────────────── Creator Camera ──────────────────────────────────
  {
    marketId: "camera",
    categories: [
      { keyword: "ミラーレスカメラ Sony α7C II フルサイズ",      cat: "Mirrorless",    pages: 2 },
      { keyword: "Sony α7C α7IV ミラーレス クリエイター",        cat: "Mirrorless" },
      { keyword: "Canon EOS R50 R8 ミラーレス 動画",             cat: "Mirrorless" },
      { keyword: "Nikon Z30 Zf ミラーレス 動画撮影",             cat: "Mirrorless" },
      { keyword: "FUJIFILM X-S20 ミラーレス クリエイター",       cat: "Mirrorless" },
      { keyword: "Panasonic LUMIX S9 ミラーレス 動画",           cat: "Mirrorless" },
      { keyword: "Sony ZV-E10 II Vlogカメラ 動画",               cat: "Vlog Camera",   pages: 2 },
      { keyword: "Sony ZV-E1 Vlog フルサイズ 動画",              cat: "Vlog Camera" },
      { keyword: "DJI Osmo Pocket 3 ジンバルカメラ Vlog",        cat: "Vlog Camera",   pages: 2 },
      { keyword: "GoPro HERO アクションカメラ 防水",             cat: "Action Camera", pages: 2 },
      { keyword: "DJI Action 4 5 アクションカメラ",              cat: "Action Camera" },
      { keyword: "Insta360 Ace Pro GO3 アクションカメラ",        cat: "Action Camera" },
      { keyword: "FUJIFILM X100VI コンパクトカメラ",             cat: "Compact Camera", pages: 2 },
      { keyword: "RICOH GR IIIx GR III コンパクトカメラ",       cat: "Compact Camera", pages: 2 },
      { keyword: "Leica Q3 コンパクトカメラ フルサイズ",         cat: "Compact Camera" },
      { keyword: "Sony FX30 FX3 シネマカメラ 動画",              cat: "Cinema Camera" },
      { keyword: "Blackmagic Pocket Cinema Camera 映像制作",     cat: "Cinema Camera" },
    ],
  },

  // ─────────────────────── Creator Audio ───────────────────────────────────
  {
    marketId: "audio",
    categories: [
      { keyword: "ワイヤレスマイク 撮影 クリエイター",   cat: "Wireless Mic",    pages: 2 },
      { keyword: "DJI Mic 2 ワイヤレスマイク",          cat: "Wireless Mic" },
      { keyword: "DJI Mic ワイヤレス 配信",             cat: "Wireless Mic" },
      { keyword: "RODE Wireless PRO GO II ワイヤレス",  cat: "Wireless Mic" },
      { keyword: "Sennheiser XSW-D ワイヤレスマイク",  cat: "Wireless Mic" },
      { keyword: "Hollyland Lark マイク",               cat: "Wireless Mic" },
      { keyword: "ショットガンマイク カメラ 外付け",          cat: "Shotgun Mic" },
      { keyword: "ガンマイク カメラ 撮影 単一指向性",         cat: "Shotgun Mic" },
      { keyword: "ラベリアマイク クリップマイク 撮影",         cat: "Lavalier Mic" },
      { keyword: "ピンマイク ラベリア クリエイター 配信",      cat: "Lavalier Mic" },
      { keyword: "カメラマイク ビデオカメラ 外付け マイク",    cat: "Camera Microphone" },
      { keyword: "オーディオインターフェース 配信 録音",       cat: "Audio Interface",  pages: 2 },
      { keyword: "Focusrite Scarlett",                         cat: "Audio Interface" },
      { keyword: "YAMAHA AG ミキサー",                         cat: "Streaming Mixer" },
    ],
  },

  // ─────────────────────── Camera Support ──────────────────────────────────
  {
    marketId: "support",
    categories: [
      { keyword: "カメラ ジンバル 3軸 スタビライザー",  cat: "Gimbal",    pages: 2 },
      { keyword: "DJI RS ジンバル",                     cat: "Gimbal" },
      { keyword: "カメラ 三脚 カーボン 撮影",           cat: "Tripod",    pages: 2 },
      { keyword: "ビデオ三脚 フルード雲台",             cat: "Tripod" },
      { keyword: "SmallRig カメラケージ ミラーレス",    cat: "Cage" },
      { keyword: "カメラ リグ ケージ アタッチメント",   cat: "Cage" },
      { keyword: "カメラ グリップ ハンドグリップ 撮影", cat: "Grip" },
      { keyword: "ビデオグリップ ハンドル カメラ 映像", cat: "Grip" },
      { keyword: "ショルダーリグ カメラ 映像制作",      cat: "Rig" },
      { keyword: "カメラ スライダー 電動",              cat: "Slider" },
      { keyword: "一脚 カーボン 撮影用",                cat: "Monopod" },
    ],
  },

  // ─────────────────────── Creator Lighting ────────────────────────────────
  {
    marketId: "lighting",
    categories: [
      { keyword: "LEDビデオライト 撮影 定常光",          cat: "LED Light",       pages: 2 },
      { keyword: "Aputure LED ライト 撮影",              cat: "LED Light" },
      { keyword: "Amaran LEDライト",                    cat: "LED Light" },
      { keyword: "Godox LED パネルライト",              cat: "LED Light" },
      { keyword: "オンカメラ ライト 小型",              cat: "On-Camera Light" },
      { keyword: "RGBライト LEDパネル 撮影",            cat: "RGB Light" },
      { keyword: "LEDチューブライト 映像",              cat: "Tube Light" },
      { keyword: "リングライト 配信 撮影",              cat: "Ring Light" },
      { keyword: "撮影用 ライトスタンド LED 定常光",    cat: "Light Stand" },
    ],
  },

  // ─────────────────────── Creator Monitor ─────────────────────────────────
  {
    marketId: "monitor",
    categories: [
      { keyword: "フィールドモニター ミラーレス 外部液晶", cat: "Field Monitor",   pages: 2 },
      { keyword: "Atomos モニターレコーダー",            cat: "Camera Monitor" },
      { keyword: "Feelworld カメラモニター",             cat: "Field Monitor" },
      { keyword: "Portkeys モニター カメラ",             cat: "Field Monitor" },
      { keyword: "4Kモニター クリエイター USB-C",        cat: "Creator Monitor" },
    ],
  },

  // ─────────────────────── Streaming Gear ──────────────────────────────────
  {
    marketId: "streaming",
    categories: [
      { keyword: "キャプチャーボード 4K 配信",           cat: "Capture Card",    pages: 2 },
      { keyword: "Elgato キャプチャーカード",            cat: "Capture Card" },
      { keyword: "AVerMedia キャプチャーカード",         cat: "Capture Card" },
      { keyword: "Elgato Stream Deck コントローラー",    cat: "Stream Deck" },
      { keyword: "配信用 オーディオミキサー ストリーマー", cat: "Streaming Mixer" },
      { keyword: "Webカメラ 4K オートフォーカス 配信",   cat: "Webcam" },
      { keyword: "ロジクール ウェブカメラ 配信",         cat: "Webcam" },
    ],
  },

  // ─────────────────────── Creator Computing ───────────────────────────────
  {
    marketId: "computing",
    categories: [
      { keyword: "MacBook Pro M4 動画編集 クリエイター",  cat: "MacBook",         pages: 2 },
      { keyword: "MacBook Air M3 M2 クリエイター",       cat: "MacBook" },
      { keyword: "クリエイター ノートPC 動画編集",        cat: "Creator Laptop",  pages: 2 },
      { keyword: "iPad Pro M4 動画編集",                  cat: "iPad" },
      { keyword: "Thunderbolt 4 ドッキングステーション",  cat: "Thunderbolt Dock" },
      { keyword: "ミニPC Intel Core クリエイター",        cat: "Mini PC" },
      { keyword: "外付けGPU eGPU 動画編集",              cat: "eGPU" },
    ],
  },

  // ─────────────────────── Camera Power ────────────────────────────────────
  {
    marketId: "power",
    categories: [
      { keyword: "ビデオカメラ バッテリー NP-FZ100 Sony", cat: "Battery",         pages: 2 },
      { keyword: "バッテリーグリップ カメラ 縦位置",          cat: "Battery Grip" },
      { keyword: "Vマウント バッテリー 業務用 放送",          cat: "V-Mount Battery" },
      { keyword: "USB-C PD モバイルバッテリー 大容量 カメラ", cat: "Power Bank" },
      { keyword: "DCカプラー 電源アダプター カメラ",          cat: "DC Coupler" },
      { keyword: "カメラ バッテリー 充電器 Sony Nikon",       cat: "Charger" },
    ],
  },
];
