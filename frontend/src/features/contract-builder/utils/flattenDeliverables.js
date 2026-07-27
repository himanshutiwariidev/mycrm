import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "./configLookup";
import { getTrackingMode } from "./deliverableTracking";

/** Maps every enabled leaf selection to the legacy deliverables[] subdocument shape. */
export function flattenDeliverables(enabledCategories = []) {
  return enabledCategories.flatMap((cat) => {
    const label = getCategoryMeta(cat.categoryId)?.label || cat.categoryId;
    return (cat.selections || []).map((sel) => {
      const hasMonthlyQuantity = sel.values?.quantityPerMonth !== undefined && sel.values?.quantityPerMonth !== "";
      const quantity = Number(sel.values?.quantityPerMonth || sel.values?.quantity || 1) || 1;
      const leafConfig = getLeafConfig(cat.categoryId, sel.path);
      return {
        title: `${label} — ${sel.label}`,
        quantity,
        frequency: hasMonthlyQuantity ? "month" : "one-time",
        categoryId: cat.categoryId,
        path: sel.path,
        trackingMode: getTrackingMode(leafConfig),
      };
    });
  });
}
