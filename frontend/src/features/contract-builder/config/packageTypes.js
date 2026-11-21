// Package tier sold to the client — "Package type" in the contract builder.
// Mirrors the enum on Contract.packageType (backend/models/Contract.js).
// Shown as yellow stars in lists: Starter ★, Standard ★★, Business ★★★.
export const PACKAGE_TYPES = [
  { value: "starter", label: "Starter", stars: 1 },
  { value: "standard", label: "Standard", stars: 2 },
  { value: "business", label: "Business", stars: 3 },
];

export const packageTypeLabel = (value) => PACKAGE_TYPES.find((p) => p.value === value)?.label || "";
export const packageTypeStars = (value) => PACKAGE_TYPES.find((p) => p.value === value)?.stars || 0;
