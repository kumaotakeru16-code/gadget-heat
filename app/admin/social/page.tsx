// /admin/social — X投稿候補管理ページ
//
// 今日のLife Gadget Heat データから投稿候補を絞り込み、
// 投稿文・カード画像の生成・コピーを管理画面で行う。
//
// 今後の拡張（未実装）:
//   - X API連携による自動投稿
//   - note記事テンプレート生成
//   - 1日3件のスケジュール投稿
//   - 投稿履歴保存（Supabase）
//   - CTR / クリック数記録
//   - LLMによる投稿文カスタマイズ
//
// Auth: ?secret=<ADMIN_SECRET>（未設定のローカル環境では省略可）

import { fetchTopMovers } from "@/lib/fetchTopMovers";
import type { Product } from "@/data/products";
import SocialDashboard from "./SocialDashboard";
import type { SocialCandidate } from "./types";

export const dynamic = "force-dynamic";

// ─── Candidate rules ──────────────────────────────────────────────────────────
// 良い投稿候補の条件:
//  • 画像と楽天リンクがある
//  • Rating ≥ 4.0 — 十分に評価されている商品のみ
//  • レビュー数 ≥ 5 — 最低限のシグナルがある
//  • 価格 ≤ ¥80,000 — 一般的なライフガジェット価格帯
//  • 商品名が適切な長さ（短すぎず長すぎず）
//  • 除外キーワードに引っかからない

const EXCLUDE_NAME_KW = [
  "ふるさと納税", "中古", "互換", "替刃", "消耗品",
  "フィルター交換", "替えブラシ", "保護フィルム",
  "ケースのみ", "延長保証", "部品取", "修理", "空箱", "説明書",
];

function isGoodCandidate(p: Product): boolean {
  if (!p.imageUrl || !p.itemUrl) return false;
  if ((p.rawReviewCount ?? 0) < 5) return false;
  if (p.rating < 4.0) return false;
  if (p.price > 80_000) return false;
  if (p.name.length < 4 || p.name.length > 50) return false;
  const lower = p.name.toLowerCase();
  return !EXCLUDE_NAME_KW.some((kw) => lower.includes(kw.toLowerCase()));
}

// reviewsDeltaが大きい = より"今トレンド" = 投稿素材として優先
function candidateRank(p: Product): number {
  return (p.reviewsDelta ?? 0) * 3 + (p.score ?? 0);
}

// ─── Short-reason rulebook (カテゴリ別ルールベース生成) ───────────────────────
const CAT_REASONS: Record<string, string> = {
  // Beauty Tech
  "Hair Dryer":          "毎日のヘアケアが格段に早くなりそう。",
  "Hair Iron":           "スタイリングの仕上がりが変わりそう。",
  "Face Care":           "スキンケアをもっと効率よく。",
  "EMS Beauty":          "自宅で手軽に美容ケアができる。",
  "EMS Body":            "自宅で手軽にボディケアができる。",
  "Scalp Care":          "頭皮ケアを日課にできそう。",
  "Hair Removal":        "サロン品質のケアが自宅で。",
  "Electric Toothbrush": "歯磨きの質がワンランク上がりそう。",

  // Kitchen Tech
  "Air Fryer":        "揚げ物が罪悪感なく食べられる。",
  "Auto Cooker":      "料理の手間がぐっと減るかも。",
  "Coffee Maker":     "毎朝のコーヒーが一段上になりそう。",
  "Soda Maker":       "炭酸水が好きな人にはたまらない。",
  "Vacuum Sealer":    "食材の鮮度が長持ちするようになる。",
  "Electric Mill":    "本格的なコーヒー体験が自宅で。",
  "Kitchen Scale":    "計量が正確になると料理の再現性が上がる。",

  // Home & Cleaning
  "Robot Vacuum":    "掃除が全自動になる。",
  "Stick Vacuum":    "さっと取り出してすぐ使えるコードレス掃除機。",
  "Air Purifier":    "部屋の空気が常に清潔に。",
  "Dehumidifier":    "梅雨時期の湿気対策に。",
  "Futon Cleaner":   "布団の中のダニ・ハウスダストを手軽に除去。",
  "Steam Cleaner":   "水蒸気で洗剤なしに汚れを落とせる。",
  "Smart Lighting":  "照明ひとつで部屋の雰囲気が変わる。",

  // Outdoor & Emergency
  "Portable Power":   "停電・アウトドアで頼れる一台。",
  "LED Lantern":      "キャンプや非常時に明かりを確保。",
  "Emergency Radio":  "もしものときの情報源として。",
  "Solar Panel":      "太陽光でどこでも充電できる。",
  "Camping Fan":      "夏のキャンプの暑さ対策に。",
  "Cooler Box":       "食材や飲み物を長時間冷やせる。",

  // Daily Utility
  "Storage":          "ごちゃつきがちな収納がすっきりまとまる。",
  "Laundry":          "洗濯まわりの手間がひとつ減る。",
  "Cleaning Tools":   "日々の掃除がもっとラクになりそう。",
  "Kitchen Utility":  "キッチンの小さな不便を解消できる。",
  "Energy Saving":    "毎月の電気代を少し抑えられるかも。",
  "Winter Goods":     "冬の寒さ対策をひとつ強化できる。",
  "Disaster Goods":   "いざというときのための備えに。",
  "Bathroom Utility": "毎日使う場所だからこそ、快適にしたい。",

  // Health & Wellness
  "Massage Gun":   "疲れた筋肉をしっかりほぐせる。",
  "Foot Massager": "1日の終わりに足をリセットできる。",
  "Smart Scale":   "健康管理がもっとシンプルに。",
  "Neck Care":     "デスクワークの首こりが和らぎそう。",
  "Sleep Gadget":  "睡眠の質を上げる一手。",
};

export default async function SocialAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  // ── Optional auth (debug routesと同パターン) ────────────────────────────────
  const configured = process.env.ADMIN_SECRET?.trim();
  if (configured) {
    const params = await searchParams;
    if (params.secret !== configured) {
      return (
        <div style={{ padding: "48px", fontFamily: "monospace", color: "#333" }}>
          <h2 style={{ marginBottom: 8 }}>401 Unauthorized</h2>
          <p style={{ color: "#666", fontSize: 13 }}>
            ?secret=&lt;ADMIN_SECRET&gt; が必要です。
          </p>
        </div>
      );
    }
  }

  const result = await fetchTopMovers();
  const products = result?.products ?? [];

  const candidates: SocialCandidate[] = products
    .filter(isGoodCandidate)
    .map((p) => ({
      product:     p,
      shortReason: CAT_REASONS[p.cat] ?? "日常をちょっと便利にしてくれるガジェット。",
      rank:        candidateRank(p),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 15);

  return (
    <SocialDashboard
      candidates={candidates}
      generatedAt={new Date().toISOString()}
    />
  );
}
