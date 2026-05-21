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
            ? "TREND SCORE の主軸はレビュー増加数（reviewsDelta）と評価の変化（ratingChg）。評価の現在値は信頼度補正として小さく寄与するだけです。スナップショットが揃う前日はBaselineスコアとして表示されます。"
            : "TREND SCORE is driven by review delta and rating movement — not static rating value. Rating is a trust correction only. Before snapshots accumulate, a quality-based Baseline Score is shown."}
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
            ? "対象は、美容家電・キッチン家電・掃除家電・防災用品・生活便利グッズなど、暮らしを少し便利にするアイテムです。価格変化はDeal Signalとして別表示し、Trend Scoreには含めません。"
            : "Scope is everyday life items: beauty appliances, kitchen gadgets, cleaning devices, emergency goods, and daily convenience items. Price movement is shown as Deal Signal — excluded from Trend Score."}
        </p>
      </div>
    </div>
  );
}
