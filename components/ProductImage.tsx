interface ProductImageProps {
  cat?: string;
  brand?: string;
  color?: string;
  src?: string;
  showLabel?: boolean;
  size?: "lg" | "md" | "sm";
}

export default function ProductImage({
  cat,
  brand,
  color,
  src,
  showLabel = true,
  size = "md",
}: ProductImageProps) {
  return (
    <>
      <div className="prod-img-inner">
        {src ? (
          <img
            src={src}
            alt={brand ? `${brand} ${cat}` : cat}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <div
            className="prod-ph-card"
            style={{ "--ph-tint": color || "oklch(0.93 0.02 70)" } as React.CSSProperties}
          >
            {size !== "sm" && <span className="ph-text">product image</span>}
          </div>
        )}
      </div>
      {showLabel && cat && (
        <span className="prod-cat-chip">
          {cat}
          {brand ? ` · ${brand}` : ""}
        </span>
      )}
    </>
  );
}
