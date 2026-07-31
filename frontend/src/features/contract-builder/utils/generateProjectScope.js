import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "./configLookup";

function describeSelection(sel, categoryId) {
  const leafConfig = getLeafConfig(categoryId, sel.path);
  const itemQuantityField = (leafConfig?.fields || []).find((f) => f.type === "per-item-quantity");
  const selectedItems = itemQuantityField ? sel.values?.[itemQuantityField.sourceField] : null;
  if (itemQuantityField && Array.isArray(selectedItems) && selectedItems.length) {
    const itemQuantities = sel.values?.[itemQuantityField.name] || {};
    const labelByValue = new Map((itemQuantityField.sourceOptions || []).map((o) => [o.value, o.label]));
    const parts = selectedItems.map((itemValue) => {
      const row = itemQuantities[itemValue] || {};
      const qty = row.quantity || 1;
      const period = row.period || "month";
      return `${labelByValue.get(itemValue) || itemValue} (${qty}/${period})`;
    });
    return `${sel.label}: ${parts.join(", ")}`;
  }
  if (sel.values?.quantityPerMonth) return `${sel.label}: ${sel.values.quantityPerMonth}/month`;
  if (sel.values?.quantity) return `${sel.label}: ${sel.values.quantity}`;
  return sel.label;
}

/** Legacy `projectScope` field: structured scope-of-work text, one section per enabled category. */
export function generateProjectScope(enabledCategories = []) {
  if (!enabledCategories.length) return "";

  return enabledCategories
    .map((cat) => {
      const label = getCategoryMeta(cat.categoryId)?.label || cat.categoryId;
      const lines = (cat.selections || []).map((sel) => `- ${describeSelection(sel, cat.categoryId)}`).join("\n");
      return `${label}\n${lines}`;
    })
    .join("\n\n");
}
