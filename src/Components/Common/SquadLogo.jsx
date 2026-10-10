import React from "react";

/**
 * SquadEmblem: Renders the "Emblème S bleu en mouvement" icon.
 * @param {number} size - Width and height in px
 * @param {boolean} withBackground - Whether to render the deep navy rounded square background
 * @param {string} bottomColor - Color of the lower S ribbon ("#ffffff" on dark bg, "#0d285a" on light bg)
 */
export function SquadEmblem({
  size = 40,
  withBackground = true,
  bottomColor = "#ffffff",
  style = {},
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: "block", ...style }}
      aria-label="Squad Delivery Emblem"
    >
      <defs>
        <linearGradient id="squadBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d285a" />
          <stop offset="100%" stopColor="#081a3c" />
        </linearGradient>
        <linearGradient id="squadTopCyan" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1b6fd1" />
          <stop offset="55%" stopColor="#2ca3fa" />
          <stop offset="100%" stopColor="#5ce1ff" />
        </linearGradient>
        <linearGradient id="squadMidShade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1458a8" />
          <stop offset="100%" stopColor="#0c3b78" />
        </linearGradient>
      </defs>

      {withBackground && (
        <rect width="120" height="120" rx="26" fill="url(#squadBgGrad)" />
      )}

      {/* Top S Ribbon + Arrow Head */}
      <path
        d="M 88 18 L 105 26 L 94 43 L 90 35 L 54 35 C 46 35 42 40 44 46 L 80 54 C 86 56 89 61 87 67 L 42 57 C 28 53 24 41 30 30 C 35 22 45 20 58 20 L 84 20 Z"
        fill="url(#squadTopCyan)"
      />

      {/* Middle Diagonal Fold */}
      <path
        d="M 44 46 L 80 54 L 74 63 L 38 54 Z"
        fill="url(#squadMidShade)"
      />

      {/* Bottom S Ribbon */}
      <path
        d="M 44 56 L 80 64 C 94 67 97 80 90 91 C 84 99 73 102 58 102 L 16 102 L 22 88 L 60 88 C 69 88 74 84 72 78 C 71 74 66 72 58 70 L 38 65 Z"
        fill={bottomColor}
      />

      {/* Speed Motion Lines */}
      <rect x="14" y="61" width="26" height="4.5" rx="2.2" fill={bottomColor} />
      <rect x="20" y="69" width="24" height="4.5" rx="2.2" fill={bottomColor} />
      <rect x="26" y="77" width="20" height="4.5" rx="2.2" fill={bottomColor} />
    </svg>
  );
}

/**
 * SquadLogo: Full horizontal brand lockup "SQUAD DELIVERY" with the S emblem in motion.
 * @param {"dark" | "light"} variant - "dark" for dark backgrounds (white text), "light" for light backgrounds (navy text)
 * @param {"sm" | "md" | "lg"} size - Preset sizing
 */
export default function SquadLogo({
  variant = "dark",
  size = "md",
  style = {},
}) {
  const isDarkBg = variant === "dark";
  const squadTextColor = isDarkBg ? "#ffffff" : "#0d285a";
  const deliveryColor = "#2997ff";

  const dimensions = {
    sm: { icon: 36, titleSize: "1.15rem", subSize: "0.62rem", lineW: "16px", gap: "10px" },
    md: { icon: 42, titleSize: "1.35rem", subSize: "0.7rem", lineW: "22px", gap: "12px" },
    lg: { icon: 64, titleSize: "2.1rem", subSize: "0.92rem", lineW: "36px", gap: "14px" },
  }[size] || { icon: 42, titleSize: "1.35rem", subSize: "0.7rem", lineW: "22px", gap: "12px" };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dimensions.gap,
        userSelect: "none",
        ...style,
      }}
    >
      <SquadEmblem
        size={dimensions.icon}
        withBackground={true}
        bottomColor="#ffffff"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontSize: dimensions.titleSize,
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: "0.02em",
            color: squadTextColor,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 0.98,
          }}
        >
          SQUAD
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "3px",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              height: "2px",
              width: dimensions.lineW,
              background: deliveryColor,
              borderRadius: "2px",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: dimensions.subSize,
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "0.1em",
              color: deliveryColor,
              textTransform: "uppercase",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            DELIVERY
          </span>
          <span
            style={{
              height: "2px",
              width: dimensions.lineW,
              background: deliveryColor,
              borderRadius: "2px",
              display: "inline-block",
            }}
          />
        </div>
      </div>
    </div>
  );
}
