"use client";

import { useEffect, useState } from "react";
import { Market } from "@/data/markets";
import { LocaleCode } from "@/data/locales";

interface TopBarProps {
  range: "week" | "month";
  setRange: (r: "week" | "month") => void;
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  currentMarket: Market;
  onOpenDrawer: () => void;
}

export default function TopBar({
  range,
  setRange,
  locale,
  setLocale,
  currentMarket,
  onOpenDrawer,
}: TopBarProps) {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const fmtTime = time
    ? time.toLocaleTimeString(locale === "jp" ? "ja-JP" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="top-left">
          <button
            className="markets-btn"
            onClick={onOpenDrawer}
            aria-label="Open market navigation"
          >
            <span className="hamb">
              <span />
              <span />
              <span />
            </span>
            <span>Markets</span>
            <span className="now">{currentMarket.short}</span>
          </button>
          <div className="brand">
            <span className="brand-mark" />
            <span>Gadget&nbsp;Heat</span>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="meta-hide">
            <span className="live-dot" />
            <span
              className="mono"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: 11,
              }}
            >
              Last updated · {fmtTime} {locale === "jp" ? "JST" : "EST"}
            </span>
          </span>
          <div className="seg" role="tablist" aria-label="Locale">
            <button
              className={locale === "jp" ? "active" : ""}
              onClick={() => setLocale("jp")}
            >
              JP
            </button>
            <button
              className={locale === "en" ? "active" : ""}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
          </div>
          <div className="seg seg-range" role="tablist" aria-label="Range">
            <button
              className={range === "week" ? "active" : ""}
              onClick={() => setRange("week")}
            >
              {locale === "jp" ? "今週" : "7d"}
            </button>
            <button
              className={range === "month" ? "active" : ""}
              onClick={() => setRange("month")}
            >
              {locale === "jp" ? "今月" : "30d"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
