"use client";

import { useMemo } from "react";
import { Product } from "@/data/products";
import { marketById } from "@/data/markets";

interface TickerProps {
  products: Product[];
}

export default function Ticker({ products }: TickerProps) {
  const items = useMemo(() => {
    const top = [...products].sort((a, b) => b.score - a.score).slice(0, 14);
    return [...top, ...top];
  }, [products]);

  return (
    <div className="container">
      <div className="ticker">
        <div className="ticker-track">
          {items.map((d, i) => (
            <span className="ticker-item" key={i}>
              <span className="market">{marketById(d.market).short}</span>
              <span className="name">
                {d.name.split(" ").slice(0, 3).join(" ")}
              </span>
              <span style={{ color: "var(--ink-3)" }}>{d.score}</span>
              <span className={d.scoreChg > 0 ? "arr-up" : d.scoreChg < 0 ? "arr-down" : ""}>
                {d.scoreChg > 0 ? "▲" : d.scoreChg < 0 ? "▼" : "▶"}{" "}
                {Math.abs(d.scoreChg).toFixed(1)}
              </span>
              <span className="sep">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
