/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Anchor ids for the page's sections (used by the section nav and "jump to first problem"). */
export const SECTION_IDS = {
  project: "cb-project",
  value: "cb-value",
  services: "cb-services",
  terms: "cb-terms",
};

export function scrollToSection(key) {
  document.getElementById(SECTION_IDS[key])?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** A section of the single-page builder: icon + title on the left, status/extra on the right. */
export function SectionCard({ id, Icon, title, subtitle, right, done, children, className }) {
  return (
    <Card id={id} className={cn("scroll-mt-36 gap-0 overflow-visible p-0 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold leading-tight">
              {title}
              {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Complete" />}
            </h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  );
}

/**
 * Label + control + optional hint/error, laid out for a grid cell.
 * `info` adds an ⓘ with a hover explanation; `labelRight` puts a small
 * control (e.g. a switch) on the label line. The label line has a fixed
 * height so boxes in the same row always line up.
 */
export function Field({ label, htmlFor, required, error, hint, info, labelRight, className, children }) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex h-5 items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="flex min-w-0 items-center gap-1 text-[13px] font-medium">
          <span className="truncate">{label}</span>
          {required && <span className="text-destructive">*</span>}
          {info && (
            <span title={info} className="shrink-0 cursor-help text-muted-foreground">
              <Info className="h-3.5 w-3.5" aria-label={info} />
            </span>
          )}
        </Label>
        {labelRight}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Small one-tap shortcut buttons under/next to a field. */
export function QuickChips({ items, className }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-colors",
            item.active
              ? "border-primary bg-primary/10 text-primary"
              : "border-dashed border-input bg-background text-muted-foreground hover:border-primary hover:text-primary"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MoneyInput({ id, value, onChange, placeholder = "0", field }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
      <Input id={id} data-field={field} type="number" min="0" inputMode="decimal" className="pl-7" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
