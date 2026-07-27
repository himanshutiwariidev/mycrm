import { getCategoryMeta } from "../config/serviceCategories";

function joinWithAnd(items) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Legacy `projectDescription` field: a readable summary paragraph generated from selected services. */
export function generateProjectDescription(enabledCategories = []) {
  if (!enabledCategories.length) return "";

  const labels = enabledCategories.map((c) => getCategoryMeta(c.categoryId)?.label || c.categoryId);
  const totalItems = enabledCategories.reduce((sum, c) => sum + (c.selections?.length || 0), 0);

  return `This contract covers ${enabledCategories.length} service area${
    enabledCategories.length > 1 ? "s" : ""
  } for the client: ${joinWithAnd(labels)}, comprising ${totalItems} total deliverable item${
    totalItems === 1 ? "" : "s"
  } tailored to the client's growth objectives.`;
}
