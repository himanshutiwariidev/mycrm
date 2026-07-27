import React from "react";
import * as Icons from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useContractWizard } from "../context/useContractWizard";
import { getCategoryMeta } from "../config/serviceCategories";
import { SERVICE_CONFIG } from "../config/services";
import CategoryRenderer from "./CategoryRenderer";

export default function ServiceAccordion() {
  const { state } = useContractWizard();
  const enabledCategories = state.selectedServices.filter((c) => c.enabled);

  if (!enabledCategories.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No services selected yet. Go back to Step 2 to choose services.
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={enabledCategories.map((c) => c.categoryId)}
      className="space-y-3"
    >
      {enabledCategories.map(({ categoryId, selections }) => {
        const meta = getCategoryMeta(categoryId);
        const config = SERVICE_CONFIG[categoryId];
        const Icon = Icons[meta?.icon] || Icons.Package;
        if (!config) return null;
        return (
          <AccordionItem
            key={categoryId}
            value={categoryId}
            className="rounded-xl border border-border bg-card px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex flex-1 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{meta?.label || categoryId}</span>
                <Badge variant="secondary" className="ml-1">
                  {selections.length} selected
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CategoryRenderer categoryId={categoryId} categoryConfig={config} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
