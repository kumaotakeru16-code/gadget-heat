"use client";

import { Market } from "@/data/markets";
import { LocaleCode } from "@/data/locales";
import type { FetchStats } from "@/lib/fetchTopMovers";
import { fmt } from "@/lib/format";

interface HeroProps {
  market:        Market;
  subcat:        string | null;
  range:         "week" | "month";
  locale:        LocaleCode;
  filteredCount: number;
  stats?:        FetchStats | null;
}

export default function Hero({
  market,
  subcat,
  range,
  locale,
  filteredCount,
  stats,
}: HeroProps) {
  const isAll = market.id === "all";
  const eyebrowLabel = isAll
    ? "LIFE GADGET MARKET VIEWER"
    : `${market.short}${subcat ? ` · ${subcat.toUpperCase()}` : ""}`;

  const titleJP = isAll ? (
    <>
      今、動いている
      <br />
      <span className="accent">ガジェット</span>。
    </>
  ) : (
    <>
      {market.name}市場で
      <br />
      <span className="accent">今動いているもの</span>。
    </>
  );

  const titleEN = isAll ? (
    <>
      What the <span className="accent">market</span>
      <br />
      is moving on right now.
    </>
  ) : (
    <>
      {market.name},<br />
      <span className="accent">in motion</span>.
    </>
  );

  const subJP = isAll
    ? "レビュー増加数と評価点数から、市場の熱量が高まっている Life Gadget を可視化。価格ランキングの「現在値」ではなく、「どれに注目が集まっているか」を見るためのビューワーです。"
    : market.blurb;

  const subEN = isAll
    ? "Trend Score combines review velocity and rating quality across Life Gadget markets. Not a price comparison — a view into what is gaining attention right now."
    : market.blurb;

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div>
            <div className="market-eyebrow">
              <span className="pill">
                <span className="dot" /> {eyebrowLabel}
              </span>
              <span className="eyebrow">
                {range === "week" ? "WEEK 20 · 2026" : "MAY · 2026"}
              </span>
            </div>
            <h1>{locale === "jp" ? titleJP : titleEN}</h1>
            <p className="hero-sub">{locale === "jp" ? subJP : subEN}</p>
            <div className="chips">
              <span className="chip">
                <span className="dot" />{" "}
                {locale === "jp"
                  ? "レビュー増加 × 評価点数"
                  : "Review Δ × Rating quality"}
              </span>
              <span className="chip muted">
                <span className="dot" />{" "}
                {locale === "jp"
                  ? "価格変化は Deal Signal として表示"
                  : "Price moves shown as Deal Signal"}
              </span>
            </div>
          </div>
          <HeroStats
            range={range}
            locale={locale}
            filteredCount={filteredCount}
            market={market}
            stats={stats ?? null}
          />
        </div>
      </div>
    </section>
  );
}

function HeroStats({
  range,
  locale,
  filteredCount,
  market,
  stats,
}: {
  range:         "week" | "month";
  locale:        LocaleCode;
  filteredCount: number;
  market:        Market;
  stats:         FetchStats | null;
}) {
  const t =
    locale === "jp"
      ? {
          monitored:   "スキャン商品数",
          reviews:     "合計レビュー数",
          trending:    "今、伸びている製品",
          rating:      "評価点数の平均",
          creatorOnly: "Signals from real shoppers",
          risingSet:   "rising set · 5.0 scale",
          pending:     "スナップショット待ち",
        }
      : {
          monitored:   "products scanned",
          reviews:     "total reviews",
          trending:    "products trending now",
          rating:      "average rating",
          creatorOnly: "signals from real shoppers",
          risingSet:   "on rising set · 5.0 scale",
          pending:     "snapshot pending",
        };

  // ── Live stats from the pipeline ────────────────────────────────────────
  if (stats) {
    const hasDelta = stats.totalReviewsDelta > 0;

    return (
      <div className="hero-stats">
        <div className="hstat">
          <div className="hstat-num">{fmt(stats.rawItemsCount)}</div>
          <div className="hstat-label">{t.monitored}</div>
          <div className="hstat-delta">{t.creatorOnly}</div>
        </div>
        <div className="hstat">
          <div className="hstat-num">
            <span className="pos">+{fmt(stats.totalReviewCount)}</span>
          </div>
          <div className="hstat-label">{t.reviews}</div>
          <div className={`hstat-delta ${hasDelta ? "up arrow-up" : ""}`}>
            {hasDelta ? `+${fmt(stats.totalReviewsDelta)} vs prev` : "—"}
          </div>
        </div>
        <div className="hstat">
          <div className="hstat-num">{stats.finalCount}</div>
          <div className="hstat-label">{t.trending}</div>
          <div className="hstat-delta">
            {market.id === "all" ? "all markets" : market.short}
          </div>
        </div>
        <div className="hstat">
          <div className="hstat-num">{stats.averageRating.toFixed(2)}</div>
          <div className="hstat-label">{t.rating}</div>
          <div className="hstat-delta">{t.risingSet}</div>
        </div>
      </div>
    );
  }

  // ── Fallback (static / market-filtered view without stats) ───────────────
  const fallback = {
    monitored: Math.max(60, filteredCount * 28),
    reviews:   Math.max(60, filteredCount * 36),
    trending:  Math.max(4, Math.round(filteredCount * 0.7)),
    rating:    4.55,
  };

  return (
    <div className="hero-stats">
      <div className="hstat">
        <div className="hstat-num">{fmt(fallback.monitored)}</div>
        <div className="hstat-label">{t.monitored}</div>
        <div className="hstat-delta">{t.creatorOnly}</div>
      </div>
      <div className="hstat">
        <div className="hstat-num">
          <span className="pos">+{fmt(fallback.reviews)}</span>
        </div>
        <div className="hstat-label">{t.reviews}</div>
        <div className="hstat-delta">—</div>
      </div>
      <div className="hstat">
        <div className="hstat-num">{fallback.trending}</div>
        <div className="hstat-label">{t.trending}</div>
        <div className="hstat-delta">—</div>
      </div>
      <div className="hstat">
        <div className="hstat-num">{fallback.rating.toFixed(2)}</div>
        <div className="hstat-label">{t.rating}</div>
        <div className="hstat-delta">{t.risingSet}</div>
      </div>
    </div>
  );
}
