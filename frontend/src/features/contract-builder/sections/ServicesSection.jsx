import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Check, Layers, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ServiceAccordion from "../engine/ServiceAccordion";
import { useContractWizard } from "../context/useContractWizard";
import { SERVICE_CATEGORIES } from "../config/serviceCategories";
import { SectionCard, SECTION_IDS } from "./ui";

/** Pick service categories (one tap each) and configure them right underneath. */
/** `configProblems`: readable names ("Facebook Content Package (Social Media)") of packages with invalid details. */
export default function ServicesSection({ pickError, configProblems = [], done }) {
  const { state, dispatch, ACTIONS, isCategoryEnabled } = useContractWizard();
  const [query, setQuery] = useState("");
  const enabled = state.selectedServices.filter((c) => c.enabled);
  const packageCount = enabled.reduce((sum, c) => sum + c.selections.length, 0);

  const q = query.trim().toLowerCase();
  const categories = q
    ? SERVICE_CATEGORIES.filter((c) => `${c.label} ${c.description}`.toLowerCase().includes(q))
    : SERVICE_CATEGORIES;

  const toggle = (id) =>
    dispatch({ type: ACTIONS.TOGGLE_CATEGORY_ENABLED, payload: { categoryId: id, enabled: !isCategoryEnabled(id) } });

  return (
    <SectionCard
      id={SECTION_IDS.services}
      Icon={Layers}
      title="Services"
      subtitle={enabled.length
        ? `${enabled.length} service${enabled.length === 1 ? "" : "s"} · ${packageCount} package${packageCount === 1 ? "" : "s"} on`
        : "Tap the services in this contract — each one opens below for its packages"}
      done={done}
      right={(
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:border-primary"
            aria-label="Search services"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    >
      {/* Columns follow the card's width (container query), not the window,
          so names stay readable next to the summary sidebar. */}
      <div className="@container">
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4">
        {categories.map((cat) => {
          const Icon = Icons[cat.icon] || Icons.Package;
          const on = isCategoryEnabled(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              aria-pressed={on}
              title={cat.description}
              className={cn(
                "group flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all",
                on ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:bg-accent"
              )}
            >
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors", on ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>
                {on ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className={cn("min-w-0 truncate text-[13px]", on ? "font-semibold" : "font-medium")}>{cat.label}</span>
            </button>
          );
        })}
        {!categories.length && <p className="text-sm text-muted-foreground">No services match “{query}”.</p>}
      </div>
      </div>
      {pickError && <p className="mt-3 text-sm text-destructive">{pickError}</p>}

      {enabled.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Packages &amp; details</h3>
            <p className="text-xs text-muted-foreground">Switch on the packages you need, then fill in quantities, pricing and notes.</p>
          </div>
          {configProblems.length > 0 && (
            <p className="text-sm text-destructive">Check the details in: {configProblems.join(", ")}</p>
          )}
          <ServiceAccordion />
        </div>
      )}
    </SectionCard>
  );
}
