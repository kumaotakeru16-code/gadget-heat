import { LocaleCode } from "@/data/locales";

interface MethodologyProps {
  locale: LocaleCode;
}

export default function Methodology({ locale }: MethodologyProps) {
  return (
    <div className="meth-grid">
      <div className="meth-block">
        <h4>About Trend Score</h4>
        <p>
          {locale === "jp"
            ? "TREND SCORE は、レビュー増加数と評価点数をもとに算出。レビューが増えていて、評価が高い製品ほど高スコア。価格変化は含まれません。"
            : "TREND SCORE is computed from review velocity and rating quality. Higher when reviews are rising AND ratings stay strong. Price moves are excluded."}
        </p>
        <div className="meth-formula">
          <span className="var">trend_score</span>
          <span className="op">=</span>
          f ( <span className="var">reviews_Δ</span>
          <span className="op">,</span> <span className="var">rating</span>
          <span className="op">,</span>{" "}
          <span className="var">rating_Δ</span> )
          <br />
          <span
            style={{
              color: "var(--ink-3)",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          >
            + aux: rank_up, new_entry, sustained_rise
          </span>
        </div>
      </div>
      <div className="meth-block">
        <h4>
          {locale === "jp"
            ? "Deal Signal — 別表示"
            : "Deal Signal — Shown Separately"}
        </h4>
        <p>
          {locale === "jp"
            ? "値引き / ポイント還元 / クーポンは「今買う理由」ですが、市場の注目度とは別の信号です。Trend Score には含めず、補助情報として表示しています。"
            : "Discounts, point-back, coupons are \"reasons to buy now\" — distinct from market attention. Excluded from Trend Score; shown as separate signal only."}
        </p>
      </div>
      <div className="meth-block">
        <h4>Coverage</h4>
        <p>
          {locale === "jp"
            ? "対象は Creator workflow に乗る製品のみ。撮る / 録る / 保存する / 編集する / 配信する に関係するもの。ゲーミングPC・自作PCパーツ・スマート家電は含みません。"
            : "Scope is the creator workflow: capture, record, store, edit, broadcast. Gaming PCs, DIY parts, smart-home are intentionally excluded."}
        </p>
      </div>
    </div>
  );
}
