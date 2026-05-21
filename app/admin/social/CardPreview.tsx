"use client";

// X投稿用カード (1200×675) — html-to-imageでPNG保存
//
// 表示: コンテナ幅に追従 (max 600px)、aspect-ratio: 16/9 で高さ自動確定
// 保存: pixelRatio:2 → 1200×675px PNG
//       cardRef は常に 600×337.5 の自然サイズ (PNG出力サイズ維持)
//       ResizeObserver でコンテナ幅を測定し scale 変換して視覚縮小
//
// CORS: 楽天CDN画像は /api/image-proxy 経由で同一origin化済み
//
// 将来の拡張:
//   - note記事用 1200×630 縦長カード
//   - カード背景テーマ切り替え

import { useRef, useState, useEffect } from "react";
import type { SocialCandidate } from "./types";
import { toProxiedImageUrl } from "@/lib/image-proxy";

// ─── ResizeObserver-based scale ───────────────────────────────────────────────
// コンテナの実幅を測定 → 600px に対する比率でスケールを算出。
// CSS aspect-ratio がコンテナ高さを決定するため、JSでの高さ計算は不要。
function useContainerScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  naturalWidth: number,
) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? naturalWidth;
      setScale(Math.min(1, w / naturalWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, naturalWidth]);
  return scale;
}

interface Props {
  candidate: SocialCandidate;
}

export default function CardPreview({ candidate }: Props) {
  const containerRef          = useRef<HTMLDivElement>(null);
  const cardRef               = useRef<HTMLDivElement>(null);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  // naturalWidth = 600 がカードの基準幅 (PNG出力 1200px の半分)
  const W         = 600;
  const H         = 337.5;
  const cardScale = useContainerScale(containerRef, W);

  async function downloadPng() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { toPng } = await import("html-to-image");
      // cardRef は 600×337.5 の自然サイズ → pixelRatio:2 → 1200×675px
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a   = document.createElement("a");
      a.download = `gadget-post-${Date.now()}.png`;
      a.href     = url;
      a.click();
    } catch (e) {
      setErr("PNG生成に失敗しました。スクリーンショットをお試しください。");
      console.error("[CardPreview]", e);
    } finally {
      setBusy(false);
    }
  }

  const p          = candidate.product;
  const score      = p.score ?? 0;
  const proxiedImg = toProxiedImageUrl(p.imageUrl);

  return (
    <div>
      {/* ── Outer: aspect-ratio で高さ自動確定、overflow:hidden でクリップ ── */}
      {/*   width: 100% / max-width: 600px でコンテナに追従                   */}
      <div
        ref={containerRef}
        style={{
          width:        "100%",
          maxWidth:     W,
          aspectRatio:  `${W} / ${H}`,
          borderRadius: 10,
          overflow:     "hidden",
          boxShadow:    "0 2px 16px oklch(0 0 0 / 0.12)",
          border:       "1px solid oklch(0.88 0.010 65)",
          position:     "relative",
        }}
      >
        {/* ── Scale layer: transform-origin top left で縮小 ─────────────── */}
        <div style={{
          position:        "absolute",
          top:             0,
          left:            0,
          width:           W,
          height:          H,
          transformOrigin: "top left",
          transform:       cardScale < 1 ? `scale(${cardScale})` : undefined,
        }}>

          {/* ── cardRef: html-to-image の捕捉対象 (600×337.5 固定) ─────── */}
          <div
            ref={cardRef}
            style={{
              width:      W,
              height:     H,
              display:    "flex",
              fontFamily: "'Geist', 'Noto Sans JP', Arial, sans-serif",
              background: "linear-gradient(140deg, oklch(0.98 0.010 78) 0%, oklch(0.94 0.018 68) 100%)",
              position:   "relative",
              overflow:   "hidden",
            }}
          >
            {/* Decorative circle */}
            <div style={{
              position:     "absolute", right: -60, bottom: -60,
              width:        260, height: 260,
              borderRadius: "50%",
              background:   "oklch(0.62 0.13 50 / 0.06)",
              pointerEvents: "none",
            }} />

            {/* Left: product image */}
            <div style={{
              width:          220,
              flexShrink:     0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              padding:        24,
              background:     "oklch(0.965 0.012 78)",
              borderRight:    "1px solid oklch(0.90 0.010 65)",
            }}>
              {proxiedImg ? (
                <img
                  src={proxiedImg}
                  alt={p.name}
                  crossOrigin="anonymous"
                  style={{ width: 156, height: 156, objectFit: "contain", borderRadius: 8 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = "flex";
                  }}
                />
              ) : null}
              <div style={{
                width:        156, height: 156,
                background:   "linear-gradient(135deg, oklch(0.90 0.010 65) 0%, oklch(0.85 0.018 78) 100%)",
                borderRadius: 8,
                display:      proxiedImg ? "none" : "flex",
                alignItems:   "center", justifyContent: "center",
                flexDirection: "column", gap: 4,
                color:        "oklch(0.52 0.010 65)",
                textAlign:    "center", padding: 8,
              }}>
                <span style={{ fontSize: 28 }}>🛍</span>
                <span style={{ fontSize: 9, lineHeight: 1.3 }}>{p.cat}</span>
              </div>
            </div>

            {/* Right: content */}
            <div style={{
              flex:          1,
              padding:       "20px 22px",
              display:       "flex",
              flexDirection: "column",
              minWidth:      0,
            }}>
              {/* Logo */}
              <div style={{
                fontSize:      8, fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color:         "oklch(0.62 0.13 50)", fontFamily: "monospace",
                marginBottom:  10,
              }}>
                Life Item Heat
              </div>

              {/* Product name */}
              <div style={{
                fontSize:        15, fontWeight: 700, lineHeight: 1.38,
                color:           "oklch(0.20 0.012 65)",
                overflow:        "hidden", display: "-webkit-box",
                WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                marginBottom:    6,
              }}>
                {p.name}
              </div>

              {/* Category */}
              <div style={{
                fontSize:      9, color: "oklch(0.52 0.010 65)",
                textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 12,
              }}>
                {p.cat}
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                {/* Heat score */}
                <div>
                  <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", marginBottom: 3, letterSpacing: "0.08em" }}>
                    HEAT
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 44, height: 4, background: "oklch(0.88 0.010 65)",
                      borderRadius: 2, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", width: `${score}%`,
                        background: "oklch(0.62 0.13 50)", borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "oklch(0.20 0.012 65)" }}>
                      {score}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", marginBottom: 3, letterSpacing: "0.08em" }}>
                    RATING
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.20 0.012 65)" }}>
                    ⭐ {p.rating.toFixed(1)}
                  </div>
                </div>

                {/* Reviews delta */}
                {(p.reviewsDelta ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", marginBottom: 3, letterSpacing: "0.08em" }}>
                      REVIEWS Δ
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.55 0.08 145)" }}>
                      +{p.reviewsDelta}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div style={{ marginLeft: "auto" }}>
                  <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", marginBottom: 3, letterSpacing: "0.08em" }}>
                    PRICE
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.36 0.010 65)" }}>
                    ¥{p.price.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Short reason */}
              <div style={{
                fontSize: 11, color: "oklch(0.36 0.010 65)",
                fontStyle: "italic", lineHeight: 1.55, flex: 1,
              }}>
                {candidate.shortReason}
              </div>

              {/* Footer */}
              <div style={{
                borderTop:      "1px solid oklch(0.88 0.010 65)",
                paddingTop:     8, marginTop: 8,
                display:        "flex", alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", letterSpacing: "0.02em" }}>
                  ※リンクにはプロモーションを含みます
                </div>
                <div style={{
                  fontSize: 8, color: "oklch(0.62 0.13 50)",
                  fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.06em",
                }}>
                  楽天で見る →
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={downloadPng}
          disabled={busy}
          className="w-full md:w-auto py-2 md:py-1 px-6 md:px-4 rounded font-medium text-[13px] md:text-[11px]"
          style={{
            border:     "1px solid oklch(0.88 0.010 65)",
            background: busy ? "oklch(0.93 0.008 78)" : "oklch(0.985 0.006 78)",
            cursor:     busy ? "wait" : "pointer",
            color:      "oklch(0.36 0.010 65)",
          }}
        >
          {busy ? "生成中…" : "PNG保存"}
        </button>
        <span style={{ fontSize: 10, color: "oklch(0.72 0.010 65)" }}>
          1200×675 · X投稿推奨サイズ
        </span>
        {err && (
          <span style={{ fontSize: 10, color: "oklch(0.62 0.13 50)" }}>
            ⚠ {err}
          </span>
        )}
      </div>
    </div>
  );
}
