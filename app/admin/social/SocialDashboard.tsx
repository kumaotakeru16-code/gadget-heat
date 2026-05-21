"use client";

import { useState } from "react";
import type { SocialCandidate } from "./types";
import CardPreview from "./CardPreview";

// ─── Post text builder (ルールベース) ─────────────────────────────────────────
// 将来的にはLLMに差し替えられるよう、独立した関数として切り出す
function buildPostText(c: SocialCandidate): string {
  const { product: p, shortReason } = c;
  const rating = p.rating.toFixed(1);
  const delta  = p.reviewsDelta ?? 0;
  const deltaNote = delta > 0 ? `（直近${delta}件増加）` : "";
  return [
    "これ、ちょっと気になる。",
    "",
    p.name,
    "",
    `レビューがじわっと増えていて${deltaNote}、評価も${rating}⭐。`,
    shortReason,
    "",
    "生活が少しラクになりそうなガジェット。",
    "",
    p.itemUrl ?? "",
    "",
    "※リンクにはプロモーションを含みます",
    "#生活家電 #便利グッズ #楽天",
  ].join("\n");
}

const MARKET_LABELS: Record<string, string> = {
  beauty:    "Beauty Tech",
  kitchen:   "Kitchen Tech",
  health:    "Health Tech",
  parenting: "Parenting Gadgets",
  desk:      "Desk Gadgets",
  cleaning:  "Home & Cleaning",
  outdoor:   "Outdoor & Emergency",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  candidates:  SocialCandidate[];
  generatedAt: string;
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function SocialDashboard({ candidates, generatedAt }: Props) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied]     = useState(false);

  const current  = candidates[selected] ?? null;
  const postText = current ? buildPostText(current) : "";

  async function copyText() {
    if (!postText) return;
    await navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dateLabel = new Date(generatedAt).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{
      fontFamily: "'Geist', 'Noto Sans JP', -apple-system, sans-serif",
      background: "oklch(0.965 0.008 78)",
      color:      "oklch(0.20 0.012 65)",
      minHeight:  "100vh",
      display:    "flex",
      flexDirection: "column",
      fontSize:   13,
    }}>

      {/* ── TopBar ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid oklch(0.88 0.010 65)",
        padding:      "14px 24px",
        display:      "flex",
        alignItems:   "center",
        gap:          16,
        background:   "oklch(0.985 0.006 78)",
        flexShrink:   0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}>
          Life Gadget Heat
        </span>
        <span style={{
          fontSize: 10, color: "oklch(0.52 0.010 65)",
          fontFamily: "monospace", letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          X投稿管理
        </span>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "oklch(0.52 0.010 65)" }}>
          {dateLabel}
          {candidates.length > 0
            ? ` · ${candidates.length}件の候補`
            : " · 候補なし"}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* Left: candidate list */}
        <div style={{
          width:        300,
          flexShrink:   0,
          borderRight:  "1px solid oklch(0.88 0.010 65)",
          overflowY:    "auto",
          background:   "oklch(0.975 0.006 78)",
        }}>
          <div style={{
            padding: "10px 16px 6px",
            fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "oklch(0.72 0.010 65)",
          }}>
            投稿候補 ({candidates.length}件)
          </div>

          {candidates.length === 0 && (
            <div style={{ padding: "20px 16px", color: "oklch(0.52 0.010 65)", fontSize: 12 }}>
              候補なし。楽天データが取得できていない可能性があります。
            </div>
          )}

          {candidates.map((c, i) => {
            const p        = c.product;
            const isActive = i === selected;
            const delta    = p.reviewsDelta ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(i); setCopied(false); }}
                style={{
                  width:        "100%",
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          10,
                  padding:      "10px 14px",
                  border:       "none",
                  borderBottom: "1px solid oklch(0.92 0.008 65)",
                  background:   isActive
                    ? "oklch(0.945 0.015 78)"
                    : "transparent",
                  cursor:       "pointer",
                  textAlign:    "left",
                  transition:   "background 0.1s",
                }}
              >
                {/* Thumbnail */}
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 40, height: 40, flexShrink: 0, borderRadius: 4,
                    background: "oklch(0.90 0.010 65)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>
                    📦
                  </div>
                )}

                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, lineHeight: 1.35,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {p.name}
                  </div>
                  <div style={{
                    marginTop: 4, fontSize: 10,
                    color: "oklch(0.52 0.010 65)",
                    display: "flex", gap: 8, flexWrap: "wrap",
                  }}>
                    <span>⭐{p.rating.toFixed(1)}</span>
                    {delta > 0 && (
                      <span style={{ color: "oklch(0.55 0.08 145)" }}>▲{delta}</span>
                    )}
                    <span>¥{p.price.toLocaleString()}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", minWidth: 0 }}>
          {!current ? (
            <div style={{ color: "oklch(0.52 0.010 65)" }}>
              左の候補一覧から商品を選択してください。
            </div>
          ) : (
            <Detail
              candidate={current}
              postText={postText}
              copied={copied}
              onCopy={copyText}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function Detail({
  candidate,
  postText,
  copied,
  onCopy,
}: {
  candidate: SocialCandidate;
  postText:  string;
  copied:    boolean;
  onCopy:    () => void;
}) {
  const p = candidate.product;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Product metadata */}
      <div>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "oklch(0.72 0.010 65)",
          marginBottom: 8,
        }}>
          {MARKET_LABELS[p.market] ?? p.market} · {p.cat}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 10 }}>
          {p.name}
        </div>
        <div style={{
          display: "flex", gap: 20, fontSize: 12,
          color: "oklch(0.36 0.010 65)", flexWrap: "wrap",
        }}>
          <span>⭐ {p.rating.toFixed(1)}</span>
          <span>{(p.rawReviewCount ?? 0).toLocaleString()} reviews</span>
          {(p.reviewsDelta ?? 0) > 0 && (
            <span style={{ color: "oklch(0.55 0.08 145)" }}>▲ {p.reviewsDelta} new</span>
          )}
          <span>Heat {p.score}</span>
          <span>¥{p.price.toLocaleString()}</span>
        </div>
        {p.itemUrl && (
          <a
            href={p.itemUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", marginTop: 10,
              fontSize: 11, color: "oklch(0.45 0.05 250)",
              textDecoration: "none",
            }}
          >
            楽天で確認 →
          </a>
        )}
      </div>

      {/* Card preview */}
      <div>
        <SectionLabel>投稿カード (1200×675)</SectionLabel>
        <CardPreview candidate={candidate} />
      </div>

      {/* Post text */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <SectionLabel>投稿文</SectionLabel>
          <button
            onClick={onCopy}
            style={{
              padding:    "4px 14px",
              borderRadius: 4,
              border:     `1px solid ${copied ? "oklch(0.75 0.06 145)" : "oklch(0.88 0.010 65)"}`,
              background: copied ? "oklch(0.93 0.04 145)" : "oklch(0.985 0.006 78)",
              fontSize:   11,
              cursor:     "pointer",
              color:      copied ? "oklch(0.42 0.10 145)" : "oklch(0.36 0.010 65)",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ コピーしました" : "投稿文をコピー"}
          </button>
        </div>
        <pre style={{
          margin:      0,
          padding:     "14px 18px",
          background:  "oklch(0.985 0.006 78)",
          border:      "1px solid oklch(0.88 0.010 65)",
          borderRadius: 6,
          fontSize:    12,
          lineHeight:  1.75,
          whiteSpace:  "pre-wrap",
          wordBreak:   "break-word",
          color:       "oklch(0.20 0.012 65)",
          fontFamily:  "'Geist Mono', 'Noto Sans JP', monospace",
        }}>
          {postText}
        </pre>
        <div style={{ marginTop: 6, fontSize: 10, color: "oklch(0.72 0.010 65)" }}>
          {postText.length}文字
          <span style={{ marginLeft: 8, color: "oklch(0.82 0.010 65)" }}>
            ※ Xの140文字制限。URLは23文字換算。
          </span>
        </div>
      </div>

    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "oklch(0.72 0.010 65)",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}
