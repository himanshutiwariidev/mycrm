/**
 * Whether a leaf's deliverable should be tracked as a repeating countable
 * quantity (e.g. "4 posts/month") or as a simple status (e.g. a one-off
 * website build, a running ad campaign) — derived from whether the leaf's
 * own config actually asks for a quantity, so adding a new service category
 * automatically gets the right tracking mode with no extra wiring.
 */
export function getTrackingMode(leafConfig) {
  const hasQuantityField = (leafConfig?.fields || []).some(
    (f) => f.name === "quantityPerMonth" || f.name === "quantity"
  );
  return hasQuantityField ? "quantity" : "status";
}

/** Finds the rich selection (values/advanced) a flattened deliverable was generated from. */
export function findMatchingSelection(contract, categoryId, path) {
  if (!categoryId || !path) return null;
  const category = (contract?.selectedServices || []).find((c) => c.categoryId === categoryId);
  return category?.selections?.find((s) => s.path === path) || null;
}
