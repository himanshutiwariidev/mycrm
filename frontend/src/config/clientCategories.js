// The client's industry — "Category" in the client form. Mirrors the enum on
// Client.businessCategory (backend/models/Client.js).
export const CLIENT_CATEGORIES = [
  { value: "manufacturing", label: "Manufacturing" },
  { value: "fmcg", label: "FMCG" },
  { value: "furniture", label: "Furniture" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "health", label: "Health" },
  { value: "electronics", label: "Electronics" },
  { value: "real-estate", label: "Real Estate" },
  { value: "automobile", label: "Automobile" },
  { value: "jewellery", label: "Jewellery" },
  { value: "perfume", label: "Perfume" },
];

export const clientCategoryLabel = (value) => CLIENT_CATEGORIES.find((c) => c.value === value)?.label || "";
