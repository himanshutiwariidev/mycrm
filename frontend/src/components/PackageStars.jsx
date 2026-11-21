import React from "react";
import { Star } from "lucide-react";
import { packageTypeLabel, packageTypeStars } from "../features/contract-builder/config/packageTypes";

/** A contract's package tier as yellow stars — Starter ★, Standard ★★, Business ★★★. */
export default function PackageStars({ packageType, size = 14, color = "#f59e0b", style }) {
  const count = packageTypeStars(packageType);
  if (!count) return null;
  const label = `${packageTypeLabel(packageType)} package`;
  return (
    <span role="img" aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", gap: 1, verticalAlign: "middle", ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={size} color={color} fill={color} strokeWidth={1.5} />
      ))}
    </span>
  );
}
