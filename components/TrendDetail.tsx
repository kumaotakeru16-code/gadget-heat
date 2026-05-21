"use client";

import { useMemo, useState } from "react";
import { Product } from "@/data/products";
import { marketById } from "@/data/markets";
import { LOCALES, LocaleCode } from "@/data/locales";
import { resolveImageUrl } from "@/data/imageOverrides";
import { fmt, signed, arrowFor } from "@/lib/format";
import ProductImage from "./ProductImage";
import Sparkline from "./Sparkline";
import Methodology from "./Methodology";

interface TrendDetailProps {
  item: Product;
  locale: LocaleCode;
  range: "week" | "month";
  onBack: () => void;
}

export default function TrendDetail({
  item,
  locale,
  range,
  onBack,
}: TrendDetailProps) {
  const [window, setWindow] = useState<"24h" | "7d" | "30d">("7d");

  const series = useMemo(() => {
    const s = [...item.spark];
    const head: number[] = [];
    for (let i = 0; i < 18; i++) {
      head.unshift(+(s[0] - (i + 1) * 0.6 - Math.sin(i) * 1.2).toFixed(1));
    }
    return [...head, ...s];
  }, [item]);

  const view =
    window === "24h"
      ? series.slice(-3)
      : window === "7d"
        ? series.slice(-12)
        : series;

  const loc = LOCALES[locale];

  return (
    <div className="container">
      <button className="detail-back" onClick={onBack}>
        <span className="arr">←</span>{" "}
        {locale === "jp" ? "市場ビューに戻る" : "Back to market view"}
      </button>

      <div className="detail-grid">
        <div
          className="detail-hero-img"
          style={{ position: "relative", overflow: "hidden" }}
        >
          <ProductImage
            cat={item.cat}
            brand={item.brand}
            color={item.color}
            src={resolveImageUrl(item.name, item.imageUrl).url}
            showLabel={false}
            blurBackdrop
          />
        </div>

        <div className="detail-body">
          <div className="timewindow">
            {(["24h", "7d", "30d"] as const).map((w) => (
              <button
                key={w}
                className={window === w ? "active" : ""}
                onClick={() => setWindow(w)}
              >
                {w}
              </button>
            ))}
          </div>

          <div>
            <div className="detail-cat">{item.cat}</div>
            <h1 className="detail-name">{item.name}</h1>
            <div className="detail-brand">
              {item.brand} · {marketById(item.market).short} Market
            </div>
          </div>

          <div className="detail-trend-block">
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: item.isBaselineScore ? "var(--ink-4)" : "var(--ink-3)",
                  marginBottom: 8,
                }}
              >
                {item.isBaselineScore ? "Baseline Score" : "Trend Score"}
              </div>
              <div className="big" style={item.isBaselineScore ? { color: "var(--ink-4)" } : {}}>
                {item.score}
              </div>
            </div>
            <Sparkline
              data={view}
              color="oklch(0.62 0.13 50)"
              width={320}
              height={70}
              strokeWidth={1.6}
            />
            <div className="trend-change">
              {item.isBaselineScore ? (
                <div className="since" style={{ color: "var(--ink-4)", fontStyle: "italic", fontSize: 12 }}>
                  Awaiting movement data
                </div>
              ) : (
                <>
                  <div
                    className={`pct ${item.scoreChg < 0 ? "down" : ""} ${arrowFor(item.scoreChg)}`}
                    style={{ fontSize: 22 }}
                  >
                    {signed(item.scoreChg, { fixed: 1 })}%
                  </div>
                  <div className="since">vs prev {window}</div>
                </>
              )}
            </div>
          </div>

          <div className="detail-signals">
            {/* Reviews Δ — primary momentum signal */}
            <div className="signal">
              {item.reviewsDelta > 0 ? (
                <>
                  <div className="l">Reviews Δ</div>
                  <div className="v">+{item.reviewsDelta}</div>
                  <div className="d">
                    {window === "24h"
                      ? `→ ${item.reviewsVelocity.toFixed(1)}/day`
                      : `${range === "week" ? "7d" : "30d"} total`}
                  </div>
                </>
              ) : (
                <>
                  <div className="l" style={{ color: "var(--ink-4)" }}>Reviews</div>
                  <div className="v" style={{ color: "var(--ink-4)" }}>{item.rawReviewCount ?? "—"}</div>
                  <div className="d flat">no new</div>
                </>
              )}
            </div>
            <div className="signal">
              <div className="l">Velocity</div>
              <div className="v">{item.reviewsVelocity.toFixed(1)}</div>
              <div className="d">reviews / day</div>
            </div>
            {/* Rating Δ as primary when moving; plain rating (muted) otherwise */}
            <div className="signal">
              {item.ratingChg !== 0 ? (
                <>
                  <div className="l">Rating Δ</div>
                  <div className={`v ${arrowFor(item.ratingChg)}`}>
                    {signed(item.ratingChg, { fixed: 2 })}
                  </div>
                  <div className="d" style={{ color: "var(--ink-4)" }}>
                    {item.rating.toFixed(1)} now
                  </div>
                </>
              ) : (
                <>
                  <div className="l" style={{ color: "var(--ink-4)" }}>Rating</div>
                  <div className="v" style={{ color: "var(--ink-4)", fontSize: 18 }}>
                    {item.rating.toFixed(1)}
                  </div>
                  <div className="d flat">—</div>
                </>
              )}
            </div>
            <div className="signal">
              <div className="l">Rank Δ</div>
              <div className="v">{signed(item.rankUp)}</div>
              <div
                className={`d ${item.rankUp === 0 ? "flat" : item.rankUp < 0 ? "down" : "up"}`}
              >
                positions
              </div>
            </div>
          </div>

          {item.aux.length > 0 && (
            <div className="aux-row">
              {item.aux.map((a) => (
                <span className="aux-tag" key={a}>
                  <span className="glyph">◆</span> {a}
                </span>
              ))}
            </div>
          )}

          <div className="spotlight-quote">
            <span className="glyph">❝</span>
            <p>
              {locale === "jp"
                ? item.isBaselineScore
                  ? `${item.cat} 市場の商品。まだ前日比較データがないため、評価ベースのBaselineスコアを表示しています。明日以降、Trend Scoreとして市場の動きが可視化されます。`
                  : item.reviewsDelta > 0
                    ? `${item.cat} 市場でレビューが ${item.reviewsDelta} 件増加。${item.ratingChg > 0 ? `評価も ${signed(item.ratingChg, { fixed: 2 })} 上昇中。` : ""}市場が今動いている製品です。`
                    : `${item.cat} 市場。レビューの新規増加はまだないが、${item.rating.toFixed(1)} の評価で安定した信頼性がある製品です。`
                : item.isBaselineScore
                  ? `${item.cat} market — no prior snapshot yet. Showing a quality-based Baseline Score until movement data arrives tomorrow.`
                  : item.reviewsDelta > 0
                    ? `${item.cat}: +${item.reviewsDelta} new reviews since yesterday.${item.ratingChg > 0 ? ` Rating trending up ${signed(item.ratingChg, { fixed: 2 })}.` : ""} The market is moving on this one.`
                    : `${item.cat} — no new reviews yet, but a solid ${item.rating.toFixed(1)} trust signal.`}
            </p>
          </div>

          <div
            className="deal-strip"
            style={{
              borderTop: "1px solid var(--rule)",
              paddingTop: 16,
              borderBottomStyle: "none",
            }}
          >
            <div className="deal-left">
              <span className="deal-tag">Deal Signal</span>
              {item.priceChg < 0 ? (
                <span className="deal-pct">
                  {locale === "jp"
                    ? `今なら ${item.priceChg}%`
                    : `${item.priceChg}% off`}
                </span>
              ) : (
                <span className="deal-pct none">
                  {locale === "jp" ? "販売施策なし" : "no current deal"}
                </span>
              )}
              <span className="deal-price">
                ¥{fmt(item.price)}
                <span className="ja">
                  {locale === "jp" ? "実質価格" : "effective"}
                </span>
              </span>
            </div>
            {item.itemUrl && (
              <a
                className="cta"
                href={item.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {locale === "jp" ? "楽天で見る" : "View on Rakuten"}{" "}
                <span className="cta-arr">↗</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="am-section">
        <h4>
          Available Markets
          <span className="locale-note">
            · {loc.region} ({loc.label})
          </span>
        </h4>
        <div className="am-grid">
          {loc.markets.map((m) => {
            const href = m.id === "rakuten" ? item.itemUrl : undefined;
            const Tag = href ? "a" : "div";
            return (
              <Tag
                className="am-card"
                key={m.id}
                {...(href
                  ? { href, target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <div className="name">{m.name}</div>
                <div className="note">{m.note}</div>
                <div className="go">
                  {href ? "View listing ↗" : "View listing →"}
                </div>
              </Tag>
            );
          })}
        </div>
        <p className="am-disclaimer">
          {locale === "jp"
            ? "Gadget Heat はマーケットごとの販売状況を表示するためのビューワーです。価格比較ではなく、各マーケットでの取り扱い有無・流通状況を見るための道標です。"
            : "Gadget Heat surfaces each marketplace as a listing, not a price race. Use this to see where a product is actually carried — not to chase the lowest sticker."}
        </p>
      </section>

      <section className="methodology" style={{ marginTop: 56 }}>
        <div className="container">
          <Methodology locale={locale} />
        </div>
      </section>
    </div>
  );
}
