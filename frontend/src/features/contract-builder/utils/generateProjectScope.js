import { getCategoryMeta } from "../config/serviceCategories";

function describeSelection(sel) {
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
      const lines = (cat.selections || []).map((sel) => `- ${describeSelection(sel)}`).join("\n");
      return `${label}\n${lines}`;
    })
    .join("\n\n");
}
