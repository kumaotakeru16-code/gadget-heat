// Per-market keyword definitions for the category-sweep fetch strategy.
//
// Design:
//   - Each entry is one keyword + its Life Item Heat cat label.
//   - `pages` controls how many Rakuten result pages to fetch (default: 1, max: 3).
//     Use pages: 2 only for the highest-signal keywords in each market.
//   - Keywords are intentionally specific: generic terms surface too much noise;
//     branded + functional phrases yield better life-item signal.
//   - Avoid SEO-bait terms: 最新・人気・ランキング・おすすめ
//
// Market status:
//   - active / experimental markets are swept by categoryFetch
//   - later markets (desk, parenting) have NO entries here — excluded from sweep
//
// Adding a market: append a new entry to MARKET_CATEGORIES.
// Category sweep is driven entirely by this file — no other config needed.

export interface CategoryEntry {
  keyword?:  string;  // keyword for Item Search; omit for genre-only search
  cat:       string;
  genreId?:  number;  // Rakuten genre ID — restricts search to this genre tree
                      // Find IDs via GET /api/debug/genre-browse?secret=...
  pages?:    number;  // pages to fetch (default 1, Rakuten max 30 items/page)
  ranking?:  boolean; // supplement with Ranking API results (requires genreId)
}

export interface MarketCategory {
  marketId:   string;
  categories: CategoryEntry[];
}

export const MARKET_CATEGORIES: MarketCategory[] = [

  // ─────────────────────── Beauty Tech (active) ────────────────────────────
  {
    marketId: "beauty",
    categories: [
      // Hair Dryer
      { keyword: "ドライヤー 大風量 速乾 プロ仕様",                cat: "Hair Dryer",          pages: 2 },
      { keyword: "Dyson ドライヤー スーパーソニック 本体",          cat: "Hair Dryer" },
      { keyword: "パナソニック ドライヤー ナノケア 本体",           cat: "Hair Dryer" },
      // Hair Iron
      { keyword: "ヘアアイロン ストレート 縮毛矯正 プロ仕様",       cat: "Hair Iron",           pages: 2 },
      { keyword: "ヘアアイロン カール 32mm コテ 海外兼用",          cat: "Hair Iron" },
      // Face Care / Facial Device
      { keyword: "美顔器 RF EMS 高周波 リフトアップ",              cat: "Face Care",           pages: 2 },
      { keyword: "美顔器 LED 光エステ コラーゲン 本体",            cat: "Face Care" },
      { keyword: "電動洗顔ブラシ 音波 毛穴 防水 シリコン",         cat: "Face Care" },
      // EMS Beauty
      { keyword: "EMS 美顔 フェイスライン 引き締め リフト",        cat: "EMS Beauty",          pages: 2 },
      { keyword: "EMSフェイスバンド 小顔 むくみ 表情筋",           cat: "EMS Beauty" },
      // Scalp Care
      { keyword: "電動頭皮ブラシ シャンプーブラシ 頭皮ケア",       cat: "Scalp Care",          pages: 2 },
      { keyword: "頭皮マッサージャー 電動 防水 振動 充電",         cat: "Scalp Care" },
      // Hair Removal
      { keyword: "家庭用脱毛器 IPL 光脱毛 全身 VIO",              cat: "Hair Removal",        pages: 2 },
      { keyword: "光脱毛器 フラッシュ 永久 ムダ毛処理",            cat: "Hair Removal" },
      // Electric Toothbrush
      { keyword: "電動歯ブラシ 音波 振動 本体 充電式 防水",        cat: "Electric Toothbrush", pages: 2 },
      { keyword: "フィリップス ソニッケアー 音波電動歯ブラシ 本体",  cat: "Electric Toothbrush" },
    ],
  },

  // ─────────────────────── Kitchen Tech (active) ───────────────────────────
  {
    marketId: "kitchen",
    categories: [
      // Air Fryer
      { keyword: "ノンフライヤー 電気フライヤー 揚げ物 油不使用",   cat: "Air Fryer",      pages: 2 },
      { keyword: "エアフライヤー コンベクション オーブン 小型",     cat: "Air Fryer" },
      // Auto Cooker
      { keyword: "電気圧力鍋 自動調理 無水調理 時短",               cat: "Auto Cooker",    pages: 2 },
      { keyword: "ホットクック シャープ ヘルシオ 自動調理鍋 本体",  cat: "Auto Cooker" },
      { keyword: "マルチクッカー 煮込み 低温調理 炊飯",             cat: "Auto Cooker" },
      // Coffee Maker
      { keyword: "全自動コーヒーメーカー 豆から 挽きたて 本体",     cat: "Coffee Maker",   pages: 2 },
      { keyword: "ネスプレッソ カプセル エスプレッソ 本体",          cat: "Coffee Maker" },
      { keyword: "デロンギ コーヒーメーカー 全自動 ミル 本体",      cat: "Coffee Maker" },
      // Soda Maker
      { keyword: "炭酸水メーカー ドリンクメイト ソーダ 家庭用",     cat: "Soda Maker",     pages: 2 },
      { keyword: "ソーダストリーム 炭酸水 ガスシリンダー 本体",     cat: "Soda Maker" },
      // Electric Mill
      { keyword: "電動コーヒーミル グラインダー 豆 均一 臼式",      cat: "Electric Mill",  pages: 2 },
      { keyword: "ポータブルコーヒーグラインダー 手動 電動 キャンプ", cat: "Electric Mill" },
      // Vacuum Sealer
      { keyword: "真空パック機 食品保存 フードシーラー 密封",        cat: "Vacuum Sealer" },
      // Kitchen Scale
      { keyword: "キッチンスケール デジタル 計量 電子秤 料理",       cat: "Kitchen Scale",  pages: 2 },
      { keyword: "計量カップ デジタル 液体 粉 精密 ベーキング",     cat: "Kitchen Scale" },
    ],
  },

  // ─────────────────────── Home & Cleaning (active) ────────────────────────
  {
    marketId: "cleaning",
    categories: [
      // Robot Vacuum
      { keyword: "ロボット掃除機 マッピング 水拭き 自動充電 段差",  cat: "Robot Vacuum",   pages: 2 },
      { keyword: "ルンバ iRobot ロボット掃除機 吸引力 本体",        cat: "Robot Vacuum" },
      { keyword: "Ecovacs ロボット掃除機 水拭き 全自動 充電",       cat: "Robot Vacuum" },
      // Stick Vacuum
      { keyword: "コードレス掃除機 スティック 軽量 吸引 充電式",    cat: "Stick Vacuum",   pages: 2 },
      { keyword: "ダイソン コードレス スティック掃除機 吸引力",     cat: "Stick Vacuum" },
      { keyword: "マキタ コードレス掃除機 軽量 スティック 本体",    cat: "Stick Vacuum" },
      // Air Purifier
      { keyword: "空気清浄機 HEPA 花粉 PM2.5 脱臭 フィルター",    cat: "Air Purifier",   pages: 2 },
      { keyword: "ダイキン 空気清浄機 加湿 静音 リビング 本体",    cat: "Air Purifier" },
      { keyword: "シャープ プラズマクラスター 空気清浄機 本体",     cat: "Air Purifier" },
      // Dehumidifier
      { keyword: "除湿機 コンプレッサー 衣類乾燥 部屋干し",         cat: "Dehumidifier",   pages: 2 },
      { keyword: "除湿乾燥機 衣類乾燥 コンパクト 静音 本体",        cat: "Dehumidifier" },
      // Futon Cleaner
      { keyword: "布団クリーナー ダニ 花粉 UV除菌 掃除機",          cat: "Futon Cleaner",  pages: 2 },
      { keyword: "レイコップ 布団クリーナー 吸引 たたき ダニ",      cat: "Futon Cleaner" },
      // Steam Cleaner
      { keyword: "スチームクリーナー 高温 除菌 洗剤不要 多用途",    cat: "Steam Cleaner",  pages: 2 },
      { keyword: "高圧洗浄機 ケルヒャー ベランダ 外壁 コンパクト",  cat: "Steam Cleaner" },
      // Smart Lighting
      { keyword: "スマート電球 LED 調光 WiFi アレクサ対応",         cat: "Smart Lighting" },
      { keyword: "フィリップスヒュー スマート照明 アプリ連動 調色",  cat: "Smart Lighting" },
    ],
  },

  // ─────────────────────── Outdoor & Emergency (active) ────────────────────
  {
    marketId: "outdoor",
    categories: [
      // Portable Power
      { keyword: "ポータブル電源 大容量 キャンプ 防災 停電",        cat: "Portable Power",   pages: 2 },
      { keyword: "Jackery EcoFlow ポータブル電源 蓄電池 AC出力",   cat: "Portable Power" },
      { keyword: "ポータブルバッテリー 大容量 AC コンセント",       cat: "Portable Power" },
      // Solar Panel
      { keyword: "ソーラーパネル 折り畳み ポータブル充電 防水",     cat: "Solar Panel",      pages: 2 },
      { keyword: "ソーラー充電器 アウトドア 防水 USB 急速",         cat: "Solar Panel" },
      // LED Lantern
      { keyword: "LEDランタン キャンプ 充電式 防水 アウトドア",     cat: "LED Lantern",      pages: 2 },
      { keyword: "ソーラーランタン 防災 充電 折りたたみ 吊り下げ",  cat: "LED Lantern" },
      // Emergency Radio
      { keyword: "防災ラジオ 手回し充電 AM FM 多機能 停電",         cat: "Emergency Radio",  pages: 2 },
      { keyword: "防災用 ラジオ 手回し スマホ充電 太陽光",           cat: "Emergency Radio" },
      // Camping Fan
      { keyword: "キャンプ 扇風機 USB 充電式 折りたたみ 携帯",      cat: "Camping Fan",      pages: 2 },
      { keyword: "アウトドア 扇風機 ポータブル 静音 テント 羽根",   cat: "Camping Fan" },
      // Cooler Box
      { keyword: "クーラーボックス 保冷 ソフト 大容量 軽量",        cat: "Cooler Box",       pages: 2 },
      { keyword: "保冷バッグ クーラーバッグ 保冷力 アウトドア BBQ", cat: "Cooler Box" },
    ],
  },

  // ─────────────────────── Daily Utility (active) ──────────────────────────
  // 生活用品・便利グッズ — ガジェット未満だが暮らしを改善するアイテム
  {
    marketId: "daily",
    categories: [
      // Storage
      { keyword: "収納 便利グッズ 省スペース 整理 引き出し",        cat: "Storage",          pages: 2 },
      { keyword: "衣類収納 圧縮袋 クローゼット 整理 真空",          cat: "Storage" },
      { keyword: "突っ張り棒 棚 収納 壁面 活用",                   cat: "Storage" },
      // Laundry
      { keyword: "洗濯 便利グッズ 時短 洗い方 機能",                cat: "Laundry",          pages: 2 },
      { keyword: "部屋干し 乾燥 除湿 洗濯物 臭わない 速乾",         cat: "Laundry" },
      { keyword: "洗濯槽クリーナー カビ 臭い 除菌 掃除",            cat: "Laundry" },
      // Cleaning Tools
      { keyword: "掃除 便利グッズ 時短 汚れ落とし 軽量",            cat: "Cleaning Tools",   pages: 2 },
      { keyword: "水切りラック シンク 食器 スリム 水はけ 省スペース", cat: "Cleaning Tools" },
      { keyword: "フローリング 拭き掃除 洗浄 クイックル 手軽",      cat: "Cleaning Tools" },
      // Kitchen Utility
      { keyword: "キッチン 便利グッズ 調理 時短 補助 作業",         cat: "Kitchen Utility",  pages: 2 },
      { keyword: "まな板 抗菌 耐熱 食洗機対応 軽量 丸まな板",       cat: "Kitchen Utility" },
      { keyword: "調理器具 皮むき スライサー チョッパー 便利",       cat: "Kitchen Utility" },
      // Energy Saving
      { keyword: "節電 グッズ 電気代 省エネ 節約 削減",             cat: "Energy Saving",    pages: 2 },
      { keyword: "スマートプラグ タイマーコンセント 節電 WiFi",      cat: "Energy Saving" },
      // Winter Goods
      { keyword: "防寒 グッズ 冬 足元 寒さ対策 節電暖房",           cat: "Winter Goods",     pages: 2 },
      { keyword: "電気毛布 掛け毛布 ホットカーペット 薄型 節電",    cat: "Winter Goods" },
      { keyword: "湯たんぽ 充電式 電気 繰り返し 長持ち",            cat: "Winter Goods" },
      // Disaster Goods
      { keyword: "防災 グッズ 非常用 備え 必需品",                  cat: "Disaster Goods",   pages: 2 },
      { keyword: "非常食 保存食 備蓄 長期保存 セット",              cat: "Disaster Goods" },
      { keyword: "防災セット 持ち出し袋 リュック 家族 備え",         cat: "Disaster Goods" },
      // Bathroom Utility
      { keyword: "浴室 便利グッズ お風呂 収納 清潔 快適",           cat: "Bathroom Utility", pages: 2 },
      { keyword: "風呂 掃除 便利 カビ防止 防カビ 水垢",             cat: "Bathroom Utility" },
    ],
  },

  // ─────────────────────── Health & Wellness (experimental) ────────────────
  // Beta: Massage / Scale / EMS Body — 医療機器・雑貨混入リスクあり
  {
    marketId: "health",
    categories: [
      { keyword: "マッサージガン 筋肉 電動 ハンドガン 振動",        cat: "Massage Gun",   pages: 2 },
      { keyword: "Theragun ハイパーボルト 電動マッサージガン 本体", cat: "Massage Gun" },
      { keyword: "フットマッサージャー エアー 足裏 ふくらはぎ",    cat: "Foot Massager", pages: 2 },
      { keyword: "足つぼ マッサージ器 電動 温熱 足裏 本体",         cat: "Foot Massager" },
      { keyword: "体重計 体脂肪 体組成計 スマート Bluetooth",       cat: "Smart Scale",   pages: 2 },
      { keyword: "スマート体重計 体組成計 アプリ連携 WiFi",         cat: "Smart Scale" },
      { keyword: "ネックマッサージャー EMS 温熱 首 肩こり",         cat: "Neck Care",     pages: 2 },
      { keyword: "首 マッサージャー 低周波 温め 肩こり解消",        cat: "Neck Care" },
      { keyword: "EMS 腹筋ベルト 電気刺激 筋トレ 腹部",            cat: "EMS Body",      pages: 2 },
      { keyword: "低周波治療器 EMSパッド 全身 筋肉 リカバリー",     cat: "EMS Body" },
      { keyword: "ホワイトノイズマシン 睡眠 快眠 サウンド",         cat: "Sleep Gadget" },
      { keyword: "スマートウォッチ 睡眠トラッカー 健康管理 心拍",   cat: "Sleep Gadget" },
    ],
  },

  // desk と parenting は status: "later" のためエントリなし
  // → keyword sweep から除外される
];
