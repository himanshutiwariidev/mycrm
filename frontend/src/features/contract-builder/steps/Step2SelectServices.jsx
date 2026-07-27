import React from "react";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SearchableServiceCommand from "../components/SearchableServiceCommand";
import { useContractWizard } from "../context/useContractWizard";
import { getCategoryMeta } from "../config/serviceCategories";

export default function Step2SelectServices() {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const enabledCategories = state.selectedServices.filter((c) => c.enabled);
  const errorMessage = state.validation.errorsByStep[2]?.message;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Select the services for this contract</h2>
        <p className="text-sm text-muted-foreground">
          Choose as many categories as needed — each one gets its own configuration card in the next step.
        </p>
      </div>

      <SearchableServiceCommand />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {enabledCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {enabledCategories.map((cat) => {
            const meta = getCategoryMeta(cat.categoryId);
            const Icon = Icons[meta?.icon] || Icons.Package;
            return (
              <Badge key={cat.categoryId} variant="secondary" className="gap-1.5 py-1.5 pl-2.5 pr-1.5 text-sm">
                <Icon className="h-3.5 w-3.5" />
                {meta?.label || cat.categoryId}
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: ACTIONS.TOGGLE_CATEGORY_ENABLED, payload: { categoryId: cat.categoryId, enabled: false } })
                  }
                  className="rounded-full hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
