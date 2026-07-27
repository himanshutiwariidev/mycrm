import React from "react";
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useContractWizard } from "../context/useContractWizard";
import { getCategoryMeta } from "../config/serviceCategories";
import { formatCurrency } from "../config/pricing";

export default function PricingCalculator() {
  const { state } = useContractWizard();
  const { perCategory, discountTotal, gstTotal, grandTotal, currency } = state.pricingSummary;
  const enabledCategories = state.selectedServices.filter((c) => c.enabled && c.selections.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {enabledCategories.map((cat) => {
            const meta = getCategoryMeta(cat.categoryId);
            const Icon = Icons[meta?.icon] || Icons.Package;
            return (
              <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {meta?.label || cat.categoryId}
                </span>
                <span className="font-medium">{formatCurrency(perCategory[cat.categoryId], currency)}</span>
              </div>
            );
          })}
          {!enabledCategories.length && (
            <p className="text-sm text-muted-foreground">No priced services yet.</p>
          )}
        </div>
        <Separator />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Discount</span>
            <span>-{formatCurrency(discountTotal, currency)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total GST</span>
            <span>+{formatCurrency(gstTotal, currency)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Services Total</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
