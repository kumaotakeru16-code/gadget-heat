"use client";

// X投稿用カード (1200×675) — html-to-imageでPNG保存
//
// 表示: 600×337.5px (50%スケール)
// 保存: pixelRatio:2 → 1200×675px PNG
//
// 注意: 楽天CDN画像のCORSポリシーにより、PNG保存時に商品画像が
//       空白になる場合があります。その場合はスクリーンショットを
//       ご利用ください。
//
// 将来の拡張:
//   - 画像プロキシAPI経由で確実にCORSを通す
//   - note記事用 1200×630 縦長カード
//   - カード背景テーマ切り替え

import { useRef, useState } from "react";
import type { SocialCandidate } from "./types";

interface Props {
  candidate: SocialCandidate;
}

export default function CardPreview({ candidate }: Props) {
  const cardRef       = useRef<HTMLDivElement>(null);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  async function downloadPng() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { toPng } = await import("html-to-image");
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

  const p     = candidate.product;
  const score = p.score ?? 0;

  // 600×337.5 で表示 / 2x キャプチャで 1200×675 に
  const W = 600;
  const H = 337.5;

  return (
    <div>
      {/* Card */}
      <div style={{
        width: W, height: H,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 2px 16px oklch(0 0 0 / 0.12)",
        border: "1px solid oklch(0.88 0.010 65)",
      }}>
        <div
          ref={cardRef}
          style={{
            width:    W,
            height:   H,
            display:  "flex",
            fontFamily: "'Geist', 'Noto Sans JP', Arial, sans-serif",
            background: "linear-gradient(140deg, oklch(0.98 0.010 78) 0%, oklch(0.94 0.018 68) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circle */}
          <div style={{
            position: "absolute", right: -60, bottom: -60,
            width: 260, height: 260,
            borderRadius: "50%",
            background: "oklch(0.62 0.13 50 / 0.06)",
            pointerEvents: "none",
          }} />

          {/* Left: product image */}
          <div style={{
            width:           220,
            flexShrink:      0,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            padding:         24,
            background:      "oklch(0.965 0.012 78)",
            borderRight:     "1px solid oklch(0.90 0.010 65)",
          }}>
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.name}
                crossOrigin="anonymous"
                style={{
                  width: 156, height: 156,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            ) : (
              <div style={{
                width: 156, height: 156,
                background: "oklch(0.90 0.010 65)",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 48,
              }}>
                📦
              </div>
            )}
          </div>

          {/* Right: content */}
          <div style={{
            flex:           1,
            padding:        "20px 22px",
            display:        "flex",
            flexDirection:  "column",
            gap:            0,
            minWidth:       0,
          }}>
            {/* Logo */}
            <div style={{
              fontSize:      8,
              fontWeight:    700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "oklch(0.62 0.13 50)",
              fontFamily:    "monospace",
              marginBottom:  10,
            }}>
              Life Gadget Heat
            </div>

            {/* Product name */}
            <div style={{
              fontSize:   15,
              fontWeight: 700,
              lineHeight: 1.38,
              color:      "oklch(0.20 0.012 65)",
              overflow:   "hidden",
              display:    "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              marginBottom: 6,
            }}>
              {p.name}
            </div>

            {/* Category */}
            <div style={{
              fontSize:      9,
              color:         "oklch(0.52 0.010 65)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              marginBottom:  12,
            }}>
              {p.cat}
            </div>

            {/* Stats row */}
            <div style={{
              display: "flex",
              gap:     14,
              alignItems: "flex-start",
              marginBottom: 12,
            }}>
              {/* Heat score */}
              <div>
                <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", marginBottom: 3, letterSpacing: "0.08em" }}>
                  HEAT
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 44, height: 4,
                    background: "oklch(0.88 0.010 65)",
                    borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width:  `${score}%`,
                      background: "oklch(0.62 0.13 50)",
                      borderRadius: 2,
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
              fontSize:   11,
              color:      "oklch(0.36 0.010 65)",
              fontStyle:  "italic",
              lineHeight: 1.55,
              flex:       1,
            }}>
              {candidate.shortReason}
            </div>

            {/* Footer */}
            <div style={{
              borderTop:   "1px solid oklch(0.88 0.010 65)",
              paddingTop:  8,
              marginTop:   8,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 8, color: "oklch(0.72 0.010 65)", letterSpacing: "0.02em" }}>
                ※リンクにはプロモーションを含みます
              </div>
              <div style={{
                fontSize:   8,
                color:      "oklch(0.62 0.13 50)",
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "0.06em",
              }}>
                楽天で見る →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={downloadPng}
          disabled={busy}
          style={{
            padding:      "5px 16px",
            borderRadius: 4,
            border:       "1px solid oklch(0.88 0.010 65)",
            background:   busy ? "oklch(0.93 0.008 78)" : "oklch(0.985 0.006 78)",
            fontSize:     11,
            cursor:       busy ? "wait" : "pointer",
            color:        "oklch(0.36 0.010 65)",
            fontWeight:   500,
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
