import React from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMON_FIELDS } from "../config/commonFields";
import { computeLeafFinalPrice } from "../config/pricing";
import { formatCurrency } from "../config/pricing";
import DynamicFieldRenderer from "./DynamicFieldRenderer";

export default function AdvancedFieldsPanel({ advanced = {}, onChange, expanded, onToggle, currency = "INR" }) {
  const { finalPrice } = computeLeafFinalPrice(advanced);
  const displayValues = { ...advanced, finalPrice };

  return (
    <div className="rounded-lg border border-dashed border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Advanced settings
          {advanced.sellingPrice ? (
            <span className="ml-1 font-normal text-foreground">
              &middot; {formatCurrency(finalPrice, currency)} final
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="border-t border-dashed border-border px-3 py-4">
          <DynamicFieldRenderer fields={COMMON_FIELDS} values={displayValues} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
