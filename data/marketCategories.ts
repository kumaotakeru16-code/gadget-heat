// Per-market keyword definitions for the category-sweep fetch strategy.
//
// Design:
//   - Each entry is one keyword + its Gadget Heat cat label.
//   - `pages` controls how many Rakuten result pages to fetch (default: 1, max: 3).
//     Use pages: 2 only for the highest-signal keywords in each market.
//   - Keywords are intentionally specific: generic terms surface too much noise;
//     branded + functional phrases yield better life-gadget signal.
//   - Avoid SEO-bait terms: 最新・人気・ランキング・おすすめ
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
  // ─────────────────────── Beauty Tech ─────────────────────────────────────
  {
    marketId: "beauty",
    categories: [
      { keyword: "ドライヤー 大風量 速乾 プロ仕様",               cat: "Hair Dryer",    pages: 2 },
      { keyword: "Dyson ドライヤー スーパーソニック",              cat: "Hair Dryer" },
      { keyword: "パナソニック ドライヤー ナノケア",              cat: "Hair Dryer" },
      { keyword: "ヘアアイロン ストレート 縮毛矯正 プロ",         cat: "Hair Iron",    pages: 2 },
      { keyword: "ヘアアイロン カール 32mm コテ 海外兼用",        cat: "Hair Iron" },
      { keyword: "美顔器 RF EMS 高周波 リフトアップ",            cat: "Face Care",    pages: 2 },
      { keyword: "美顔器 LED 光エステ コラーゲン",               cat: "Face Care" },
      { keyword: "電動洗顔ブラシ 音波 毛穴 防水",               cat: "Face Care" },
      { keyword: "EMS 美顔 フェイスライン 引き締め リフト",      cat: "EMS",          pages: 2 },
      { keyword: "EMS パッド 腹筋 電気刺激 筋トレ",             cat: "EMS" },
      { keyword: "電動頭皮ブラシ シャンプーブラシ 頭皮ケア",    cat: "Scalp Care",   pages: 2 },
      { keyword: "頭皮マッサージャー 電動 防水 振動",            cat: "Scalp Care" },
      { keyword: "家庭用脱毛器 IPL 光脱毛 永久 全身",           cat: "Hair Removal", pages: 2 },
      { keyword: "光脱毛器 フラッシュ VIO ムダ毛処理",          cat: "Hair Removal" },
    ],
  },

  // ─────────────────────── Kitchen Tech ────────────────────────────────────
  {
    marketId: "kitchen",
    categories: [
      { keyword: "ノンフライヤー 電気フライヤー 揚げ物 油不使用",  cat: "Air Fryer",      pages: 2 },
      { keyword: "エアフライヤー フィリップス コンベクション",     cat: "Air Fryer" },
      { keyword: "電気圧力鍋 自動調理 無水調理 時短",             cat: "Auto Cooker",    pages: 2 },
      { keyword: "ホットクック シャープ ヘルシオ 自動調理鍋",     cat: "Auto Cooker" },
      { keyword: "マルチクッカー 煮込み 低温調理 スロー",         cat: "Auto Cooker" },
      { keyword: "全自動コーヒーメーカー 豆から 挽きたて",         cat: "Coffee Maker",   pages: 2 },
      { keyword: "ネスプレッソ カプセル エスプレッソ 本体",        cat: "Coffee Maker" },
      { keyword: "デロンギ コーヒーメーカー 全自動 ミル",         cat: "Coffee Maker" },
      { keyword: "炭酸水メーカー ドリンクメイト ソーダ 家庭用",   cat: "Soda Maker",     pages: 2 },
      { keyword: "ソーダストリーム 炭酸水 ガスシリンダー 本体",   cat: "Soda Maker" },
      { keyword: "真空パック機 食品保存 フードシーラー 密封",      cat: "Vacuum Sealer" },
      { keyword: "電動コーヒーミル グラインダー 豆 均一",         cat: "Electric Mill" },
    ],
  },

  // ─────────────────────── Health Tech ─────────────────────────────────────
  {
    marketId: "health",
    categories: [
      { keyword: "マッサージガン 筋肉 電動 ハンドガン 振動",      cat: "Massage Gun",   pages: 2 },
      { keyword: "Theragun ハイパーボルト 電動マッサージガン",    cat: "Massage Gun" },
      { keyword: "フットマッサージャー エアー 足裏 ふくらはぎ",  cat: "Foot Massager", pages: 2 },
      { keyword: "足つぼ マッサージ器 電動 温熱 足裏",           cat: "Foot Massager" },
      { keyword: "体重計 体脂肪 体組成計 スマート Bluetooth",    cat: "Smart Scale",   pages: 2 },
      { keyword: "スマート体重計 Withings 体組成計 アプリ連携",  cat: "Smart Scale" },
      { keyword: "ネックマッサージャー EMS 温熱 首 肩こり",      cat: "Neck Care",     pages: 2 },
      { keyword: "首 マッサージャー 低周波 温め 肩こり解消",     cat: "Neck Care" },
      { keyword: "EMS 腹筋ベルト 電気刺激 筋トレ 腹部",          cat: "EMS",           pages: 2 },
      { keyword: "低周波治療器 EMSパッド 全身 筋肉 リカバリー",  cat: "EMS" },
      { keyword: "ホワイトノイズマシン 睡眠 快眠 サウンド",      cat: "Sleep Gadget" },
      { keyword: "スマートウォッチ 睡眠トラッカー 健康管理 心拍", cat: "Sleep Gadget" },
    ],
  },

  // ─────────────────────── Parenting Gadgets ───────────────────────────────
  {
    marketId: "parenting",
    categories: [
      { keyword: "ベビーモニター 見守りカメラ 双方向通話 WiFi",   cat: "Baby Monitor",    pages: 2 },
      { keyword: "ベビーカメラ 赤ちゃん スマホ連動 夜間",        cat: "Baby Monitor" },
      { keyword: "哺乳瓶ウォーマー ミルク 温め 保温 授乳",       cat: "Bottle Warmer",   pages: 2 },
      { keyword: "電動搾乳機 授乳 ハンズフリー 静音 持ち運び",   cat: "Nursing Gadget" },
      { keyword: "電動鼻吸い器 赤ちゃん 吸引力 静音",            cat: "Nursing Gadget" },
      { keyword: "ベビースケール 新生児 体重計 デジタル 授乳前後", cat: "Baby Scale" },
      { keyword: "加湿器 赤ちゃん 超音波 静音 ベビー部屋",       cat: "Baby Humidifier", pages: 2 },
      { keyword: "空気清浄機 加湿 ベビー 花粉 PM2.5 静音",      cat: "Baby Humidifier" },
    ],
  },

  // ─────────────────────── Desk Gadgets ────────────────────────────────────
  {
    marketId: "desk",
    categories: [
      { keyword: "デスクライト LED 調光 調色 モニター 目に優しい", cat: "Desk Light",       pages: 2 },
      { keyword: "学習デスクライト 目に優しい USB給電 アーム",    cat: "Desk Light" },
      { keyword: "USB-C ハブ 7in1 マルチポート 4K HDMI",         cat: "USB-C Hub",        pages: 2 },
      { keyword: "USB Type-C ハブ 映像出力 SDカード 有線LAN",    cat: "USB-C Hub" },
      { keyword: "ワイヤレス充電器 15W Qi2 急速充電 スタンド",   cat: "Wireless Charger", pages: 2 },
      { keyword: "MagSafe 対応 充電器 置くだけ スマホ充電",      cat: "Wireless Charger" },
      { keyword: "メカニカルキーボード 静音 コンパクト テンキーレス", cat: "Keyboard",      pages: 2 },
      { keyword: "ワイヤレスキーボード Bluetooth 薄型 省スペース", cat: "Keyboard" },
      { keyword: "電動昇降デスク スタンディング 高さ調節 メモリ",  cat: "Standing Desk",   pages: 2 },
      { keyword: "デスク収納 ガジェット オーガナイザー USB 充電", cat: "Gadget Organizer" },
      { keyword: "ケーブルクリップ デスク 整理 配線 マグネット",  cat: "Gadget Organizer" },
    ],
  },

  // ─────────────────────── Home & Cleaning ─────────────────────────────────
  {
    marketId: "cleaning",
    categories: [
      { keyword: "ロボット掃除機 マッピング 水拭き 自動充電 段差", cat: "Robot Vacuum",   pages: 2 },
      { keyword: "ルンバ iRobot ロボット掃除機 吸引力",           cat: "Robot Vacuum" },
      { keyword: "コードレス掃除機 スティック 軽量 吸引 充電",    cat: "Handy Vacuum",   pages: 2 },
      { keyword: "ダイソン コードレス スティック掃除機 吸引力",   cat: "Handy Vacuum" },
      { keyword: "空気清浄機 HEPA 花粉 PM2.5 脱臭 フィルター",  cat: "Air Purifier",   pages: 2 },
      { keyword: "ダイキン 空気清浄機 加湿 静音 リビング",        cat: "Air Purifier" },
      { keyword: "除湿機 コンプレッサー 衣類乾燥 部屋干し",       cat: "Dehumidifier",   pages: 2 },
      { keyword: "除湿乾燥機 衣類乾燥 コンパクト 静音",           cat: "Dehumidifier" },
      { keyword: "スマート電球 LED 調光 WiFi アレクサ対応",       cat: "Smart Lighting" },
      { keyword: "フィリップスヒュー スマート照明 アプリ連動 調色", cat: "Smart Lighting" },
    ],
  },

  // ─────────────────────── Outdoor & Emergency ─────────────────────────────
  {
    marketId: "outdoor",
    categories: [
      { keyword: "ポータブル電源 大容量 キャンプ 防災 停電",       cat: "Portable Power",   pages: 2 },
      { keyword: "Jackery EcoFlow ポータブル電源 蓄電池 AC出力",  cat: "Portable Power" },
      { keyword: "ソーラーパネル 折り畳み ポータブル充電 防水",    cat: "Solar Charger",    pages: 2 },
      { keyword: "ソーラー充電器 アウトドア 防水 USB 急速",        cat: "Solar Charger" },
      { keyword: "LEDランタン キャンプ 充電式 防水 アウトドア",    cat: "LED Lantern",      pages: 2 },
      { keyword: "ソーラーランタン 防災 充電 折りたたみ 吊り下げ", cat: "LED Lantern" },
      { keyword: "防災ラジオ 手回し充電 AM FM 多機能 停電",        cat: "Emergency Radio",  pages: 2 },
      { keyword: "防災用 ラジオ 手回し スマホ充電 太陽光",         cat: "Emergency Radio" },
      { keyword: "ポータブル発電機 小型 インバーター 静音",         cat: "Mini Generator" },
      { keyword: "カセットガス発電機 アウトドア 停電 防災",         cat: "Mini Generator" },
    ],
  },
];
