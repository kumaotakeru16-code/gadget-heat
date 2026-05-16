"use client";

import { Market } from "@/data/markets";
import { LocaleCode } from "@/data/locales";
import { Product } from "@/data/products";
import { fmt, signed, arrowFor } from "@/lib/format";

interface HeroProps {
  market: Market;
  subcat: string | null;
  range: "week" | "month";
  locale: LocaleCode;
  filteredCount: number;
}

export default function Hero({
  market,
  subcat,
  range,
  locale,
  filteredCount,
}: HeroProps) {
  const isAll = market.id === "all";
  const eyebrowLabel = isAll
    ? "CREATOR GEAR MARKET VIEWER"
    : `${market.short}${subcat ? ` · ${subcat.toUpperCase()}` : ""}`;

  const titleJP = isAll ? (
    <>
      今、動いている
      <br />
      <span className="accent">ガジェット</span>。
    </>
  ) : (
    <>
      {market.name.replace(/^Creator /, "")}市場で
      <br />
      <span className="accent">今動いている</span>もの。
    </>
  );

  const titleEN = isAll ? (
    <>
      What the <span className="accent">creator market</span>
      <br />
      is moving on.
    </>
  ) : (
    <>
      {market.name},<br />
      <span className="accent">in motion</span>.
    </>
  );

  const subJP = isAll
    ? "レビュー増加数と評価点数から、市場の熱量が高まっている Creator Gear を可視化。価格ランキングの「現在値」ではなく、「どれに注目が集まっているか」を見るためのビューワーです。"
    : market.blurb;

  const subEN = isAll
    ? "Trend Score combines review velocity and rating quality across Creator markets. Not a price comparison — a view into what is gaining attention."
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
            count={filteredCount}
            market={market}
          />
        </div>
      </div>
    </section>
  );
}

function HeroStats({
  range,
  locale,
  count,
  market,
}: {
  range: "week" | "month";
  locale: LocaleCode;
  count: number;
  market: Market;
}) {
  const isAll = market.id === "all";
  const isWeek = range === "week";
  const periodJP = isWeek ? "今週" : "今月";
  const periodEN = isWeek ? "this week" : "this month";

  const stats = isAll
    ? {
        monitored: 4286,
        reviews: 1284,
        trending: 86,
        rating: 4.52,
        reviewsPrev: 1102,
        trendingPrev: 74,
      }
    : {
        monitored: Math.max(60, count * 28),
        reviews: Math.max(60, count * 36),
        trending: Math.max(4, Math.round(count * 0.7)),
        rating: 4.55,
        reviewsPrev: Math.max(50, count * 30),
        trendingPrev: Math.max(3, Math.round(count * 0.55)),
      };

  const reviewsDelta = stats.reviews - stats.reviewsPrev;
  const trendingDelta = stats.trending - stats.trendingPrev;

  const t =
    locale === "jp"
      ? {
          monitored: "監視中の製品",
          reviews: `${periodJP}追加されたレビュー`,
          trending: "今、伸びている製品",
          rating: "評価点数の平均",
          last: "先週比",
        }
      : {
          monitored: "products monitored",
          reviews: `reviews added ${periodEN}`,
          trending: "products trending now",
          rating: "average rating",
          last: "vs prev",
        };

  return (
    <div className="hero-stats">
      <div className="hstat">
        <div className="hstat-num">{fmt(stats.monitored)}</div>
        <div className="hstat-label">{t.monitored}</div>
        <div className="hstat-delta">Creator workflow only</div>
      </div>
      <div className="hstat">
        <div className="hstat-num">
          <span className="pos">+{fmt(stats.reviews)}</span>
        </div>
        <div className="hstat-label">{t.reviews}</div>
        <div
          className={`hstat-delta ${reviewsDelta >= 0 ? "up arrow-up" : "down arrow-down"}`}
        >
          {signed(reviewsDelta)} {t.last}
        </div>
      </div>
      <div className="hstat">
        <div className="hstat-num">{stats.trending}</div>
        <div className="hstat-label">{t.trending}</div>
        <div
          className={`hstat-delta ${trendingDelta >= 0 ? "up arrow-up" : "down arrow-down"}`}
        >
          {signed(trendingDelta)} vs prev
        </div>
      </div>
      <div className="hstat">
        <div className="hstat-num">{stats.rating.toFixed(2)}</div>
        <div className="hstat-label">{t.rating}</div>
        <div className="hstat-delta">on rising set · 5.0 scale</div>
      </div>
    </div>
  );
}
