"use client";

import { useEffect, useMemo } from "react";
import { MARKETS, PRODUCTS } from "@/data";

const ACTIVE_MARKETS       = MARKETS.filter((m) => m.id !== "all" && m.status === "active");
const EXPERIMENTAL_MARKETS = MARKETS.filter((m) => m.status === "experimental");
const LATER_MARKETS        = MARKETS.filter((m) => m.status === "later");

interface MarketDrawerProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  subcat: string | null;
  onPick: (marketId: string, subcat: string | null) => void;
}

export default function MarketDrawer({
  open,
  onClose,
  marketId,
  subcat,
  onPick,
}: MarketDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of MARKETS) {
      c[m.id] = PRODUCTS.filter((p) => p.market === m.id).length;
    }
    c.all = PRODUCTS.length;
    return c;
  }, []);

  function MarketRow({ m, clickable = true }: { m: typeof MARKETS[0]; clickable?: boolean }) {
    const isActive = marketId === m.id && !subcat;
    return (
      <div className="drawer-market" key={m.id}>
        <div
          className={`market-row ${isActive ? "active" : ""}`}
          onClick={clickable ? () => onPick(m.id, null) : undefined}
          role={clickable ? "button" : undefined}
          style={clickable ? undefined : { pointerEvents: "none" }}
        >
          <div>
            <div className="market-name">{m.name}</div>
            <div className="market-tag">
              {m.tagline}
              {m.status === "experimental" && (
                <span style={{ marginLeft: "0.4em", opacity: 0.6, fontSize: "0.85em" }}>
                  · Beta data
                </span>
              )}
              {clickable && (
                <span style={{ marginLeft: "0.25em" }}>
                  · {counts[m.id] ?? 0} products
                </span>
              )}
            </div>
          </div>
        </div>
        {clickable && m.subcats.length > 0 && (
          <div className="subcats">
            {m.subcats.map((s) => (
              <button
                key={s}
                className={`subcat-chip ${marketId === m.id && subcat === s ? "active" : ""}`}
                onClick={() => onPick(m.id, s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <div className="drawer-title">Markets · Creator Gear</div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 14 14" width="14" height="14">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
        <div className="drawer-body">
          {/* ALL Markets */}
          <div
            className={`all-link ${marketId === "all" ? "active" : ""}`}
            onClick={() => onPick("all", null)}
            role="button"
          >
            <div>
              <div className="l1">ALL Markets</div>
              <div className="l2">
                Across Creator Markets · {counts.all} products
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              {marketId === "all" ? "Viewing" : "View →"}
            </div>
          </div>

          {/* Active markets */}
          {ACTIVE_MARKETS.map((m) => (
            <MarketRow key={m.id} m={m} />
          ))}

          {/* Experimental markets */}
          {EXPERIMENTAL_MARKETS.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  margin: "1.25rem 0 0.5rem 0.25rem",
                }}
              >
                Beta Markets
              </div>
              {EXPERIMENTAL_MARKETS.map((m) => (
                <MarketRow key={m.id} m={m} />
              ))}
            </>
          )}

          {/* Later markets — visible but not clickable */}
          {LATER_MARKETS.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.35,
                  margin: "1.25rem 0 0.5rem 0.25rem",
                }}
              >
                Coming Later
              </div>
              <div style={{ opacity: 0.4 }}>
                {LATER_MARKETS.map((m) => (
                  <MarketRow key={m.id} m={m} clickable={false} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="drawer-foot">
          <span>Beta · v0.2</span>
          <span>Creator Workflow only</span>
        </div>
      </aside>
    </>
  );
}
