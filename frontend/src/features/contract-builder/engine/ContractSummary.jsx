import React from "react";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContractWizard } from "../context/useContractWizard";
import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "../utils/configLookup";
import { computeLeafFinalPrice, formatCurrency, computeContractTaxSummary } from "../config/pricing";
import { groupSharedSelections, getSharingLabel } from "../utils/contentSharing";

function describeQuantity(sel, categoryId) {
  const leafConfig = getLeafConfig(categoryId, sel.path);
  const itemQuantityField = (leafConfig?.fields || []).find((f) => f.type === "per-item-quantity");
  const selectedItems = itemQuantityField ? sel.values?.[itemQuantityField.sourceField] : null;
  if (itemQuantityField && Array.isArray(selectedItems) && selectedItems.length) {
    return `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}`;
  }
  return sel.values?.quantityPerMonth || sel.values?.quantity || null;
}

export default function ContractSummary({ variant = "sidebar" }) {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const currency = state.meta.currency || "INR";
  const { finalAmount, gstEnabled } = computeContractTaxSummary(state.meta);
  const enabledCategories = state.selectedServices.filter((c) => c.enabled && c.selections.length);

  const removeLeaf = (categoryId, path) =>
    dispatch({ type: ACTIONS.SET_LEAF_ENABLED, payload: { categoryId, path, enabled: false } });

  const removeCategory = (categoryId) =>
    dispatch({ type: ACTIONS.TOGGLE_CATEGORY_ENABLED, payload: { categoryId, enabled: false } });

  const content = (
    <div className="space-y-4">
      {enabledCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">No services selected yet.</p>
      )}
      {enabledCategories.map((cat) => {
        const meta = getCategoryMeta(cat.categoryId);
        const Icon = Icons[meta?.icon] || Icons.Package;
        return (
          <div key={cat.categoryId} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {meta?.label || cat.categoryId}
              </span>
              <button
                type="button"
                onClick={() => removeCategory(cat.categoryId)}
                className="text-muted-foreground hover:text-destructive"
                title="Remove category"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-1.5 pl-1">
              {groupSharedSelections(cat.selections).map(({ primary: sel, members }) => {
                // Platforms posting the same content (e.g. Instagram + LinkedIn
                // linked to Facebook) share one line and one combined amount.
                const isShared = members.length > 1;
                const finalPrice = members.reduce((sum, m) => sum + computeLeafFinalPrice(m.advanced).finalPrice, 0);
                const qty = describeQuantity(sel, cat.categoryId);
                const label = isShared ? members.map((m) => getSharingLabel(cat.categoryId, m.path)).join(" + ") : sel.label;
                return (
                  <li key={sel.path} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs">
                    <span className={isShared ? "min-w-0" : "truncate"}>
                      <span className={isShared ? "block break-words" : undefined}>
                        {label}
                        {qty ? <span className="text-muted-foreground"> &times;{qty}</span> : null}
                      </span>
                      {isShared && (
                        <span className="block text-[11px] text-muted-foreground">Same content on {members.length} platforms</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-medium">{formatCurrency(finalPrice, currency)}</span>
                      <button
                        type="button"
                        onClick={() => members.forEach((m) => removeLeaf(cat.categoryId, m.path))}
                        className="text-muted-foreground hover:text-destructive"
                        title={isShared ? `Remove ${label}` : undefined}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className={variant === "sidebar" ? "sticky top-20" : ""}>
      <CardHeader>
        <CardTitle>Contract Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Radix wraps the viewport content in a `display: table` div that grows
            to the widest row, which pushed long rows' amounts past the card
            edge — force it back to block so rows fit (and truncate) inside. */}
        {variant === "sidebar" ? (
          <ScrollArea className="max-h-[45vh] pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">{content}</ScrollArea>
        ) : (
          content
        )}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{gstEnabled ? "Final Amount (incl. GST)" : "Contract Amount"}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(finalAmount, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
