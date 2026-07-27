import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { joinPath } from "../utils/idHelpers";
import LeafItemCard from "./LeafItemCard";

/**
 * Recursively renders a category/group node: if it has `groups`, renders a
 * Tabs strip and recurses into the active group; if it has `items`, renders
 * a LeafItemCard per item. The same code path handles Social Media's 1-level
 * platform tabs and Ranking Optimization's 2-level Domestic/International ->
 * SEO/AEO/GEO/Local-SEO tree, plus flat categories with items directly.
 */
export default function TabTreeRenderer({ categoryId, node, pathPrefix = "" }) {
  const groups = node.groups || [];
  const [activeId, setActiveId] = useState(groups[0]?.id);

  if (groups.length) {
    return (
      <Tabs value={activeId} onValueChange={setActiveId} className="w-full">
        <TabsList className="w-full flex-wrap justify-start">
          {groups.map((group) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((group) => (
          <TabsContent key={group.id} value={group.id}>
            <TabTreeRenderer categoryId={categoryId} node={group} pathPrefix={joinPath(pathPrefix, group.id)} />
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  const items = node.items || [];
  if (items.length) {
    const isGrid = node.kind === "grid";
    return (
      <div className={cn(isGrid ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "space-y-3")}>
        {items.map((leaf) => (
          <LeafItemCard
            key={leaf.id}
            categoryId={categoryId}
            path={joinPath(pathPrefix, leaf.id)}
            leafConfig={leaf}
          />
        ))}
      </div>
    );
  }

  return null;
}
