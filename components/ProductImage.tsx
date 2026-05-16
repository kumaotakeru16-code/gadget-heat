interface ProductImageProps {
  cat?: string;
  brand?: string;
  color?: string;
  src?: string;
  showLabel?: boolean;
  size?: "lg" | "md" | "sm";
  // Enables editorial blur-backdrop treatment for large hero cards.
  // When false (default), renders a clean product image or placeholder.
  // Future: set src=undefined to switch to image-less editorial mode
  // (score typography + sparkline + brand mark only).
  blurBackdrop?: boolean;
}

export default function ProductImage({
  cat,
  brand,
  color,
  src,
  showLabel = true,
  size = "md",
  blurBackdrop = false,
}: ProductImageProps) {
  const warmBg = color || "oklch(0.93 0.02 70)";

  return (
    <>
      <div
        className="prod-img-inner"
        style={{
          position: "relative",
          background: src && blurBackdrop ? warmBg : undefined,
        }}
      >
        {src ? (
          <>
            {/* Blurred backdrop — softens hard edges, keeps editorial feel */}
            {blurBackdrop && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${src})`,
                  backgroundSize: "120% 120%",
                  backgroundPosition: "center",
                  filter: "blur(22px) saturate(0.3) brightness(1.05)",
                  opacity: 0.2,
                  pointerEvents: "none",
                }}
              />
            )}
            <img
              src={src}
              alt={brand ? `${brand} ${cat}` : cat}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "auto",
                display: "block",
              }}
            />
          </>
        ) : (
          <div
            className="prod-ph-card"
            style={{ "--ph-tint": warmBg } as React.CSSProperties}
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
