import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PERIOD_OPTIONS = [
  { value: "week", label: "Per Week" },
  { value: "month", label: "Per Month" },
  { value: "year", label: "Per Year" },
];

/**
 * One quantity + cadence row per item currently selected in `field.sourceField`
 * (a sibling MULTISELECT on the same leaf) — e.g. Social Media's "Deliverables
 * Included" checklist, where Graphic Creatives and AI Reels can each have
 * their own quantity and week/month/year cadence instead of one shared value.
 */
export default function PerItemQuantityField({ field, values, value, onChange }) {
  const selectedValues = values?.[field.sourceField] || [];
  const labelByValue = new Map((field.sourceOptions || []).map((o) => [o.value, o.label]));
  const rows = value || {};

  const updateRow = (itemValue, patch) => {
    const current = rows[itemValue] || { quantity: 4, period: "month" };
    onChange({ ...rows, [itemValue]: { ...current, ...patch } });
  };

  if (selectedValues.length === 0) {
    return <p className="text-xs text-muted-foreground">Select deliverables above to set their quantities.</p>;
  }

  return (
    <div className="space-y-2">
      {selectedValues.map((itemValue) => {
        const row = rows[itemValue] || { quantity: 4, period: "month" };
        return (
          <div key={itemValue} className="flex items-center gap-2 rounded-lg border border-input p-2">
            <span className="flex-1 truncate text-sm">{labelByValue.get(itemValue) || itemValue}</span>
            <Input
              type="number"
              min="0"
              className="w-20 shrink-0"
              value={row.quantity}
              onChange={(e) => updateRow(itemValue, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
            />
            <Select value={row.period} onValueChange={(period) => updateRow(itemValue, { period })}>
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
