import React from "react";
import TabTreeRenderer from "./TabTreeRenderer";

/**
 * Public entry point for rendering one category's configuration UI.
 * Every category (flat-list, grid, or nested tab-tree) bottoms out through
 * TabTreeRenderer's groups/items recursion — no per-category branch here.
 */
export default function CategoryRenderer({ categoryId, categoryConfig }) {
  if (!categoryConfig) return null;
  return <TabTreeRenderer categoryId={categoryId} node={categoryConfig} pathPrefix="" />;
}
