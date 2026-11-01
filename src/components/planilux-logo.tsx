"use client";

import Image from "next/image";

type PlaniLuxLogoProps = {
  size?: number;
  showText?: boolean;
  className?: string;
  subtitle?: string;
};

export function PlaniLuxLogo({
  size = 34,
  showText = true,
  className = "",
  subtitle,
}: PlaniLuxLogoProps) {
  return (
    <div className={`planilux-brand-combo ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div
        className="planilux-logo-icon"
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(20, 18, 35, 0.16)",
          flexShrink: 0,
        }}
      >
        <Image
          src="/logo.png"
          alt="Logo PlaniLux"
          width={size * 2}
          height={size * 2}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          priority
        />
      </div>
      {showText && (
        <div className="planilux-logo-texts" style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span
            className="planilux-logo-name"
            style={{
              fontSize: Math.max(16, Math.round(size * 0.58)),
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "var(--ink, #292a34)",
            }}
          >
            Plani<span style={{ color: "var(--violet, #8c7dc8)" }}>Lux</span>
          </span>
          {subtitle && (
            <span
              className="planilux-logo-caption"
              style={{
                fontSize: "0.6875rem",
                color: "var(--muted, #655f72)",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
