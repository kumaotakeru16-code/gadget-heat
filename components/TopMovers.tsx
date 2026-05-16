"use client";

import { Product } from "@/data/products";
import { marketById } from "@/data/markets";
import { LocaleCode } from "@/data/locales";
import { fmt, signed, arrowFor } from "@/lib/format";
import ProductImage from "./ProductImage";
import Sparkline from "./Sparkline";

interface TopMoversProps {
  items: Product[];
  locale: LocaleCode;
  range: "week" | "month";
  onOpen: (item: Product) => void;
}

export default function TopMovers({
  items,
  locale,
  range,
  onOpen,
}: TopMoversProps) {
  const [m1, m2, m3] = items;
  return (
    <div className="container">
      <div className="top-movers">
        {m1 && <Mover1 item={m1} locale={locale} range={range} onOpen={onOpen} />}
        <div className="mover-side">
          {m2 && <MoverSide item={m2} rank={2} locale={locale} onOpen={onOpen} />}
          {m3 && <MoverSide item={m3} rank={3} locale={locale} onOpen={onOpen} />}
        </div>
      </div>
    </div>
  );
}

function Mover1({
  item,
  locale,
  range,
  onOpen,
}: {
  item: Product;
  locale: LocaleCode;
  range: "week" | "month";
  onOpen: (item: Product) => void;
}) {
  return (
    <article className="mover mover-1" onClick={() => onOpen(item)}>
      <div className="mover-image">
        <ProductImage cat={item.cat} brand={item.brand} color={item.color} />
        <span className="mover-rank">
          No. 01 / {range === "week" ? "Week 20" : "May 2026"}
        </span>
        <span className="mover-market-tag">
          {marketById(item.market).short}
        </span>
      </div>
      <div className="mover-body">
        <div>
          <div className="mover-cat">
            {item.cat} · {item.brand}
          </div>
          <h3 className="mover-name">{item.name}</h3>
        </div>

        <div className="trend-block">
          <div className="trend-score-num">
            <span className="label">Trend Score</span>
            <span>{item.score}</span>
          </div>
          <Sparkline
            data={item.spark}
            color="oklch(0.62 0.13 50)"
            width={240}
            height={44}
          />
          <div className="trend-change">
            <div
              className={`pct ${item.scoreChg < 0 ? "down" : ""} ${arrowFor(item.scoreChg)}`}
            >
              {signed(item.scoreChg, { fixed: 1 })}%
            </div>
            <div className="since">
              vs prev {range === "week" ? "7d" : "30d"}
            </div>
          </div>
        </div>

        <div className="signals">
          <div className="signal">
            <div className="l">Reviews Δ</div>
            <div className="v">+{item.reviewsDelta}</div>
            <div className="d">→ {item.reviewsVelocity.toFixed(1)}/day</div>
          </div>
          <div className="signal">
            <div className="l">Rating</div>
            <div className="v">{item.rating.toFixed(1)}</div>
            <div
              className={`d ${item.ratingChg === 0 ? "flat" : ""} ${arrowFor(item.ratingChg)}`}
            >
              {signed(item.ratingChg, { fixed: 1 })}
            </div>
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

        <div className="deal-strip">
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
                {locale === "jp" ? "なし" : "no deal"}
              </span>
            )}
            <span className="deal-price">
              ¥{fmt(item.price)}
              <span className="ja">
                {locale === "jp" ? "実質価格" : "effective"}
              </span>
            </span>
          </div>
          <button
            className="cta"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(item);
            }}
          >
            Trend details <span className="cta-arr">→</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function MoverSide({
  item,
  rank,
  locale,
  onOpen,
}: {
  item: Product;
  rank: number;
  locale: LocaleCode;
  onOpen: (item: Product) => void;
}) {
  return (
    <article className="mover mover-md" onClick={() => onOpen(item)}>
      <div className="mover-image">
        <ProductImage
          cat={item.cat}
          brand={item.brand}
          color={item.color}
          showLabel={false}
        />
        <span className="mover-rank">
          No.{String(rank).padStart(2, "0")}
        </span>
        <span className="mover-market-tag">
          {marketById(item.market).short}
        </span>
      </div>
      <div className="mover-body">
        <div>
          <div className="mover-cat">{item.cat}</div>
          <h3 className="mover-name">{item.name}</h3>
        </div>
        <div className="md-trend">
          <div>
            <div className="num">{item.score}</div>
            <div className="lab">Trend Score</div>
          </div>
          <Sparkline
            data={item.spark}
            color="oklch(0.50 0.04 65)"
            width={120}
            height={26}
            fill={false}
            strokeWidth={1.2}
          />
          <div
            className={`pct ${item.scoreChg < 0 ? "down" : ""} ${arrowFor(item.scoreChg)}`}
          >
            {signed(item.scoreChg, { fixed: 1 })}%
          </div>
        </div>
        <div className="mini-stats">
          <span className="it">
            <span className="l">Reviews Δ</span>
            <span className="v">+{item.reviewsDelta}</span>
          </span>
          <span className="it">
            <span className="l">Rating</span>
            <span className="v">{item.rating.toFixed(1)}</span>
          </span>
        </div>
        <div className="mover-foot">
          {item.priceChg < 0 ? (
            <span className="deal">Deal · {item.priceChg}%</span>
          ) : (
            <span style={{ color: "var(--ink-4)" }}>No deal</span>
          )}
          <span>Trend details →</span>
        </div>
      </div>
    </article>
  );
}
