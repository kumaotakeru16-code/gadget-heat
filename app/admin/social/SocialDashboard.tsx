"use client";

import { useState, useEffect, useRef } from "react";
import type { SocialCandidate } from "./types";
import CardPreview from "./CardPreview";
import { toProxiedImageUrl } from "@/lib/image-proxy";

// ─── Post text builder (ルールベース) ─────────────────────────────────────────
// 将来的にはLLMに差し替えられるよう、独立した関数として切り出す
function buildPostText(c: SocialCandidate): string {
  const { product: p, shortReason } = c;
  const rating    = p.rating.toFixed(1);
  const delta     = p.reviewsDelta ?? 0;
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
  beauty:   "Beauty Tech",
  kitchen:  "Kitchen Tech",
  health:   "Health & Wellness",
  cleaning: "Home & Cleaning",
  outdoor:  "Outdoor & Emergency",
  daily:    "Daily Utility",
};

// ─── Scroll-to-detail (mobile only) ──────────────────────────────────────────
// レイアウト自体はTailwindのmd:クラスで制御するため、ここではスクロール動作のみ。
function useScrollToDetail(
  ref: React.RefObject<HTMLDivElement | null>,
  trigger: number,
) {
  useEffect(() => {
    if (!ref.current) return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ref, trigger]);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  candidates:  SocialCandidate[];
  generatedAt: string;
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function SocialDashboard({ candidates, generatedAt }: Props) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied]     = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useScrollToDetail(detailRef, selected);

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
    <div
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: "'Geist', 'Noto Sans JP', -apple-system, sans-serif",
        background: "oklch(0.965 0.008 78)",
        color:      "oklch(0.20 0.012 65)",
        fontSize:   13,
      }}
    >

      {/* ── TopBar ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-wrap items-center gap-1.5 md:gap-4 py-3 px-4 md:py-3.5 md:px-6"
        style={{
          borderBottom: "1px solid oklch(0.88 0.010 65)",
          background:   "oklch(0.985 0.006 78)",
        }}
      >
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
        <div
          className="w-full md:w-auto md:ml-auto"
          style={{ fontSize: 11, color: "oklch(0.52 0.010 65)" }}
        >
          {dateLabel}
          {candidates.length > 0
            ? ` · ${candidates.length}件の候補`
            : " · 候補なし"}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {/*
        mobile : flex-col — リスト → 詳細の縦積み。ページ全体でスクロール。
        desktop: flex-row / overflow-hidden — 各パネルが独立してスクロール。
      */}
      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 md:overflow-hidden">

        {/* ── Left: candidate list ─────────────────────────────────────────── */}
        <div
          className="w-full md:w-[300px] shrink-0 overflow-y-auto max-h-[42vh] md:max-h-none border-b-2 md:border-b-0 md:border-r"
          style={{
            borderColor: "oklch(0.88 0.010 65)",
            background:  "oklch(0.975 0.006 78)",
          }}
        >
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10"
            style={{
              padding:       "10px 16px 6px",
              background:    "oklch(0.975 0.006 78)",
              fontSize:      9,
              fontWeight:    600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "oklch(0.72 0.010 65)",
            }}
          >
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
                className="w-full flex items-start gap-2.5 px-3.5 py-3 md:py-2.5 text-left cursor-pointer transition-colors"
                style={{
                  border:       "none",
                  borderBottom: "1px solid oklch(0.92 0.008 65)",
                  background:   isActive ? "oklch(0.945 0.015 78)" : "transparent",
                }}
              >
                {/* Thumbnail: 56px on mobile, 40px on desktop */}
                {toProxiedImageUrl(p.imageUrl) ? (
                  <img
                    src={toProxiedImageUrl(p.imageUrl)!}
                    alt=""
                    className="w-14 h-14 md:w-10 md:h-10 object-cover rounded shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 md:w-10 md:h-10 shrink-0 rounded flex items-center justify-center text-2xl md:text-lg"
                    style={{ background: "oklch(0.90 0.010 65)" }}
                  >
                    🛍
                  </div>
                )}

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div style={{
                    fontSize:        11,
                    fontWeight:      600,
                    lineHeight:      1.38,
                    overflow:        "hidden",
                    display:         "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak:       "break-word",
                  }}>
                    {p.name}
                  </div>
                  <div
                    className="flex flex-wrap gap-2 mt-1"
                    style={{ fontSize: 10, color: "oklch(0.52 0.010 65)" }}
                  >
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

        {/* ── Right: detail ────────────────────────────────────────────────── */}
        <div
          ref={detailRef}
          className="min-w-0 p-4 md:flex-1 md:py-7 md:px-8 md:overflow-y-auto"
        >
          {!current ? (
            <div style={{ color: "oklch(0.52 0.010 65)" }}>
              候補一覧から商品を選択してください。
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
    <div className="flex flex-col gap-5 md:gap-7">

      {/* Product metadata */}
      <div>
        <div style={{
          fontSize:      9,
          fontWeight:    600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color:         "oklch(0.72 0.010 65)",
          marginBottom:  8,
        }}>
          {MARKET_LABELS[p.market] ?? p.market} · {p.cat}
        </div>
        <div style={{
          fontSize:     16,
          fontWeight:   700,
          lineHeight:   1.4,
          marginBottom: 10,
          wordBreak:    "break-word",
        }}>
          {p.name}
        </div>
        <div
          className="flex flex-wrap gap-3 md:gap-5"
          style={{ fontSize: 12, color: "oklch(0.36 0.010 65)" }}
        >
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
              display:        "inline-block",
              marginTop:      10,
              padding:        "7px 14px",
              borderRadius:   4,
              border:         "1px solid oklch(0.88 0.010 65)",
              background:     "oklch(0.985 0.006 78)",
              fontSize:       12,
              color:          "oklch(0.45 0.05 250)",
              textDecoration: "none",
              fontWeight:     500,
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

      {/* Post text + copy */}
      <div>
        <div className="flex items-center flex-wrap gap-2.5 mb-2.5">
          <SectionLabel>投稿文</SectionLabel>
          <button
            onClick={onCopy}
            className="w-full md:w-auto py-2 md:py-1 px-5 md:px-3.5 rounded font-medium cursor-pointer transition-all text-[13px] md:text-[11px]"
            style={{
              border:     `1px solid ${copied ? "oklch(0.75 0.06 145)" : "oklch(0.88 0.010 65)"}`,
              background: copied ? "oklch(0.93 0.04 145)" : "oklch(0.985 0.006 78)",
              color:      copied ? "oklch(0.42 0.10 145)" : "oklch(0.36 0.010 65)",
            }}
          >
            {copied ? "✓ コピーしました" : "投稿文をコピー"}
          </button>
        </div>
        <pre
          className="m-0 text-[13px] md:text-[12px] px-3.5 py-3 md:px-[18px] md:py-[14px]"
          style={{
            background:  "oklch(0.985 0.006 78)",
            border:      "1px solid oklch(0.88 0.010 65)",
            borderRadius: 6,
            lineHeight:  1.75,
            whiteSpace:  "pre-wrap",
            wordBreak:   "break-word",
            color:       "oklch(0.20 0.012 65)",
            fontFamily:  "'Geist Mono', 'Noto Sans JP', monospace",
          }}
        >
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
      fontSize:      9,
      fontWeight:    600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color:         "oklch(0.72 0.010 65)",
      marginBottom:  10,
    }}>
      {children}
    </div>
  );
}
