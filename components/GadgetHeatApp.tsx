"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS, MARKETS, ALL_MARKET, marketById } from "@/data";
import { LocaleCode } from "@/data/locales";
import { Product } from "@/data/products";
import { applyMarketFilter } from "@/lib/filters";
import { RAKUTEN_ACTIVE_MARKET_IDS } from "@/data/markets";
import type { FetchStats } from "@/lib/fetchTopMovers";
import { fmt, signed } from "@/lib/format";
import TopBar from "./TopBar";
import MarketDrawer from "./MarketDrawer";
import Hero from "./Hero";
import Ticker from "./Ticker";
import TopMovers from "./TopMovers";
import CompactRanking from "./CompactRanking";
import TrendDetail from "./TrendDetail";
import Methodology from "./Methodology";

interface GadgetHeatAppProps {
  initialRakutenProducts?: Product[] | null;
  initialStats?:           FetchStats | null;
}

export default function GadgetHeatApp({
  initialRakutenProducts,
  initialStats,
}: GadgetHeatAppProps) {
  const [range, setRange] = useState<"week" | "month">("week");
  const [locale, setLocale] = useState<LocaleCode>("jp");
  const [marketId, setMarketId] = useState("all");
  const [subcat, setSubcat] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [showSpark, setShowSpark] = useState(true);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-CA"));
  }, []);

  const currentMarket = useMemo(() => marketById(marketId), [marketId]);

  // Use Rakuten data when the selected market has live data; fall back to static.
  const filtered = useMemo(() => {
    const useRakuten =
      initialRakutenProducts &&
      initialRakutenProducts.length > 0 &&
      (marketId === "all" || RAKUTEN_ACTIVE_MARKET_IDS.includes(marketId));

    if (useRakuten) {
      let arr = initialRakutenProducts!;
      if (marketId !== "all") {
        arr = arr.filter((p) => p.market === marketId);
      }
      if (subcat) arr = arr.filter((p) => p.cat === subcat);
      return [...arr].sort((a, b) => b.score - a.score);
    }

    return applyMarketFilter(PRODUCTS, marketId, subcat);
  }, [marketId, subcat, initialRakutenProducts]);

  const handlePick = useCallback(
    (mid: string, sc: string | null) => {
      setMarketId(mid);
      setSubcat(sc);
      setDrawerOpen(false);
      setDetail(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3, 23); // max 20 in CompactRanking; "load more" to come

  const isLiveData =
    !!initialRakutenProducts &&
    initialRakutenProducts.length > 0 &&
    (marketId === "all" || RAKUTEN_ACTIVE_MARKET_IDS.includes(marketId));

  // Number of products rendered this render (for debug meta)
  const renderedCount = top3.length + rest.length;

  if (detail) {
    return (
      <div className="app">
        <TopBar
          range={range}
          setRange={setRange}
          locale={locale}
          setLocale={setLocale}
          currentMarket={currentMarket}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <MarketDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          marketId={marketId}
          subcat={subcat}
          onPick={handlePick}
        />
        <TrendDetail
          item={detail}
          locale={locale}
          range={range}
          onBack={() => setDetail(null)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        range={range}
        setRange={setRange}
        locale={locale}
        setLocale={setLocale}
        currentMarket={currentMarket}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <MarketDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        marketId={marketId}
        subcat={subcat}
        onPick={handlePick}
      />
      <Hero
        market={currentMarket}
        subcat={subcat}
        range={range}
        locale={locale}
        filteredCount={filtered.length}
        stats={isLiveData ? (initialStats ?? null) : null}
      />
      <Ticker products={PRODUCTS} />

      <div className="container">
        <div className="tabs-row">
          <h2 className="section-title">
            {marketId === "all"
              ? "Top Movers · Across Creator Markets"
              : `Top Movers · ${currentMarket.name}${subcat ? ` · ${subcat}` : ""}`}
            <small>
              {range === "week" ? "WEEK 20 · 2026" : "MAY · 2026"}
              {" · "}
              {filtered.length}{" "}
              {locale === "jp" ? "製品を監視中" : "products monitored"}
              {isLiveData && initialRakutenProducts && initialRakutenProducts.length !== filtered.length && (
                <span style={{ marginLeft: "0.4em", opacity: 0.45 }}>
                  ({initialRakutenProducts.length} total)
                </span>
              )}
              {isLiveData && (
                <span style={{ marginLeft: "0.5em", opacity: 0.55 }}>· Live</span>
              )}
            </small>
          </h2>
          {currentMarket.subcats.length > 0 && (
            <div className="tabs">
              <button
                className={`tab ${subcat === null ? "active" : ""}`}
                onClick={() => setSubcat(null)}
              >
                All
              </button>
              {currentMarket.subcats.map((s) => (
                <button
                  key={s}
                  className={`tab ${subcat === s ? "active" : ""}`}
                  onClick={() => setSubcat(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {top3.length > 0 && (
        <TopMovers
          items={top3}
          locale={locale}
          range={range}
          onOpen={setDetail}
        />
      )}

      {rest.length > 0 && (
        <CompactRanking
          items={rest}
          showSpark={showSpark}
          onOpen={setDetail}
          range={range}
        />
      )}

      <section className="methodology">
        <div className="container">
          <Methodology locale={locale} />
          <div className="colophon">
            <span>Gadget Heat · Creator Gear Market Viewer</span>
            <span>
              v0.2 Concept ·{" "}
              {isLiveData ? "Rakuten Live" : "Static Mock"} ·{" "}
              {isLiveData && initialStats
                ? `${initialStats.finalCount} products · `
                : ""}
              {today ?? "—"}
            </span>
          </div>

          {/* Debug meta — shows pipeline stats to confirm counts match */}
          {isLiveData && initialStats && (
            <div
              style={{
                marginTop: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-4)",
                letterSpacing: "0.08em",
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span>raw: {initialStats.rawItemsCount}</span>
              <span>final: {initialStats.finalCount}</span>
              <span>rendered: {renderedCount}</span>
              {initialStats.failedRequests > 0 && (
                <span style={{ color: "oklch(0.55 0.12 30)" }}>
                  ⚠ {initialStats.failedRequests} failed
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
