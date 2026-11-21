import React, { useEffect, useRef, useState } from "react";
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
  const enabledKey = enabledCategories.map((c) => c.categoryId).join(",");

  // Controlled so a service picked on the same screen opens straight away
  // (an uncontrolled defaultValue only applies to the first render).
  const [open, setOpen] = useState(() => enabledCategories.map((c) => c.categoryId));
  const seen = useRef(new Set(open));
  useEffect(() => {
    const added = enabledCategories.map((c) => c.categoryId).filter((id) => !seen.current.has(id));
    if (added.length) {
      added.forEach((id) => seen.current.add(id));
      setOpen((prev) => [...prev, ...added]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey]);

  if (!enabledCategories.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No services selected yet — pick one above to configure it.
      </div>
    );
  }

  return (
    <Accordion type="multiple" value={open} onValueChange={setOpen} className="space-y-3">
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
