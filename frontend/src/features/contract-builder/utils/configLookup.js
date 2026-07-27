import { SERVICE_CONFIG } from "../config/services";

function walk(node, segments) {
  if (!node) return null;
  if (!segments.length) return node;
  const [head, ...rest] = segments;
  if (node.items) {
    const leaf = node.items.find((i) => i.id === head);
    if (leaf) return rest.length ? null : leaf;
  }
  if (node.groups) {
    const group = node.groups.find((g) => g.id === head);
    if (group) return walk(group, rest);
  }
  return null;
}

/** Resolves a leaf's static config from its runtime dot-path, e.g. "facebook.graphic-creatives". */
export function getLeafConfig(categoryId, path) {
  const category = SERVICE_CONFIG[categoryId];
  if (!category || !path) return null;
  return walk(category, String(path).split("."));
}

/** Flattens every leaf in a category's tree into [{ path, leaf }], used for search & bulk operations. */
export function flattenCategoryLeaves(categoryConfig) {
  const result = [];
  function visit(node, prefix) {
    (node.items || []).forEach((leaf) => {
      result.push({ path: prefix ? `${prefix}.${leaf.id}` : leaf.id, leaf });
    });
    (node.groups || []).forEach((group) => {
      visit(group, prefix ? `${prefix}.${group.id}` : group.id);
    });
  }
  visit(categoryConfig, "");
  return result;
}
