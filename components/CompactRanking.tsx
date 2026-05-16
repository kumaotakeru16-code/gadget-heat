"use client";

import { Product } from "@/data/products";
import { marketById } from "@/data/markets";
import { fmt, signed, arrowFor } from "@/lib/format";
import ProductImage from "./ProductImage";
import Sparkline from "./Sparkline";

interface CompactRankingProps {
  items: Product[];
  showSpark: boolean;
  onOpen: (item: Product) => void;
  range: "week" | "month";
  startIndex?: number;
}

export default function CompactRanking({
  items,
  showSpark,
  onOpen,
  range,
  startIndex = 4,
}: CompactRankingProps) {
  return (
    <section className="container rank-section">
      <div className="rank-head">
        <h3>
          The Rest of the Market · {String(startIndex).padStart(2, "0")} –{" "}
          {String(items.length + startIndex - 1).padStart(2, "0")}
        </h3>
        <span className="meta">
          Ranked by Trend Score ·{" "}
          {range === "week" ? "7d" : "30d"} window
        </span>
      </div>
      <div>
        {items.map((item, i) => (
          <RankRow
            key={item.id}
            item={item}
            idx={i + startIndex}
            showSpark={showSpark}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function RankRow({
  item,
  idx,
  showSpark,
  onOpen,
}: {
  item: Product;
  idx: number;
  showSpark: boolean;
  onOpen: (item: Product) => void;
}) {
  return (
    <div className="rank-row" role="row" onClick={() => onOpen(item)}>
      <div className="rk mono">{String(idx).padStart(2, "0")}</div>
      <div className="rk-img">
        <ProductImage
          cat={item.cat}
          brand={item.brand}
          showLabel={false}
          color={item.color}
          size="sm"
        />
      </div>
      <div className="rk-name">
        <div className="meta">
          <span className="market">{marketById(item.market).short}</span>
          <span>{item.cat}</span>
        </div>
        <div className="nm">{item.name}</div>
      </div>
      <div className="rk-trend">
        <div className="score">{item.score}</div>
        <div
          className={`chg ${item.scoreChg < 0 ? "down" : item.scoreChg === 0 ? "flat" : ""} ${arrowFor(item.scoreChg)}`}
        >
          {signed(item.scoreChg, { fixed: 1 })}%
        </div>
      </div>
      <div className="rk-metric">
        <div className="ml">Reviews Δ</div>
        <div className="mv">+{item.reviewsDelta}</div>
        <div className="md up">→ {item.reviewsVelocity.toFixed(1)}/d</div>
      </div>
      <div className="rk-metric">
        <div className="ml">Rating</div>
        <div className="mv">{item.rating.toFixed(1)}</div>
        <div
          className={`md ${item.ratingChg === 0 ? "flat" : ""} ${arrowFor(item.ratingChg)}`}
        >
          {signed(item.ratingChg, { fixed: 1 })}
        </div>
      </div>
      {showSpark ? (
        <Sparkline
          data={item.spark}
          color="oklch(0.50 0.04 65)"
          width={140}
          height={30}
          fill={false}
          strokeWidth={1.2}
        />
      ) : (
        <div />
      )}
      <div className="rk-deal">
        {item.priceChg < 0 ? (
          <>
            <div className="dt">Deal</div>
            <div className="dv">{item.priceChg}%</div>
            <div className="dp">¥{fmt(item.price)}</div>
          </>
        ) : (
          <>
            <div className="dt">Deal</div>
            <div className="dv none">—</div>
            <div className="dp">¥{fmt(item.price)}</div>
          </>
        )}
      </div>
    </div>
  );
}
