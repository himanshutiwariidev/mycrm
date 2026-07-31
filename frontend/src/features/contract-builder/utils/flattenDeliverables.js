import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "./configLookup";
import { getTrackingMode } from "./deliverableTracking";

/** Maps every enabled leaf selection to the legacy deliverables[] subdocument shape. */
export function flattenDeliverables(enabledCategories = []) {
  return enabledCategories.flatMap((cat) => {
    const label = getCategoryMeta(cat.categoryId)?.label || cat.categoryId;
    return (cat.selections || []).flatMap((sel) => {
      const leafConfig = getLeafConfig(cat.categoryId, sel.path);

      // Per-item quantity tracking (e.g. Social Media's "Deliverables
      // Included" checklist): one deliverable row per selected item, each
      // with its own quantity/cadence, instead of one shared quantity for
      // the whole leaf.
      const itemQuantityField = (leafConfig?.fields || []).find((f) => f.type === "per-item-quantity");
      const selectedItems = itemQuantityField ? sel.values?.[itemQuantityField.sourceField] : null;
      if (itemQuantityField && Array.isArray(selectedItems) && selectedItems.length) {
        const itemQuantities = sel.values?.[itemQuantityField.name] || {};
        const labelByValue = new Map((itemQuantityField.sourceOptions || []).map((o) => [o.value, o.label]));
        return selectedItems.map((itemValue) => {
          const row = itemQuantities[itemValue] || {};
          const quantity = Number(row.quantity) || 1;
          const frequency = ["week", "month", "year"].includes(row.period) ? row.period : "one-time";
          return {
            title: `${label} — ${sel.label}: ${labelByValue.get(itemValue) || itemValue}`,
            quantity,
            frequency,
            categoryId: cat.categoryId,
            path: sel.path,
            trackingMode: "quantity",
          };
        });
      }

      const hasMonthlyQuantity = sel.values?.quantityPerMonth !== undefined && sel.values?.quantityPerMonth !== "";
      const quantity = Number(sel.values?.quantityPerMonth || sel.values?.quantity || 1) || 1;
      return [{
        title: `${label} — ${sel.label}`,
        quantity,
        frequency: hasMonthlyQuantity ? "month" : "one-time",
        categoryId: cat.categoryId,
        path: sel.path,
        trackingMode: getTrackingMode(leafConfig),
      }];
    });
  });
}
