import React from "react";
import * as Icons from "lucide-react";
import { Check } from "lucide-react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "../config/serviceCategories";
import { useContractWizard } from "../context/useContractWizard";

export default function SearchableServiceCommand() {
  const { state, dispatch, ACTIONS, isCategoryEnabled } = useContractWizard();

  return (
    <Command className="rounded-xl border border-border shadow-sm">
      <CommandInput
        placeholder="Search services (e.g. SEO, Web Development, Events...)"
        value={state.ui.searchQuery}
        onValueChange={(query) => dispatch({ type: ACTIONS.SET_SEARCH_QUERY, payload: { query } })}
      />
      <CommandList className="max-h-96">
        <CommandEmpty>No services match your search.</CommandEmpty>
        <CommandGroup heading="Service Categories">
          {SERVICE_CATEGORIES.map((cat) => {
            const Icon = Icons[cat.icon] || Icons.Package;
            const enabled = isCategoryEnabled(cat.id);
            return (
              <CommandItem
                key={cat.id}
                value={`${cat.label} ${cat.description}`}
                onSelect={() => dispatch({ type: ACTIONS.TOGGLE_CATEGORY_ENABLED, payload: { categoryId: cat.id, enabled: !enabled } })}
                className="flex items-start gap-3 py-2.5"
              >
                <span className={cn("mt-0.5 flex h-4 w-4 items-center justify-center rounded border", enabled ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {enabled && <Check className="h-3 w-3" />}
                </span>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">{cat.label}</span>
                  <span className="block text-xs text-muted-foreground">{cat.description}</span>
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
