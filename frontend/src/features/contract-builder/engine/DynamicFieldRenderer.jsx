import React from "react";
import { FIELD_TYPES } from "../config/fieldDefinitions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import QuantityInput from "./QuantityInput";
import TagsInput from "./TagsInput";
import MultiSelectField from "./MultiSelectField";
import DateField from "./DateField";
import AttachmentUploader from "./AttachmentUploader";

function FieldShell({ field, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {children}
    </div>
  );
}

function RadioField({ field, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(field.options || []).map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-accent"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Single field-type -> component mapping used by every category, flat or
 * nested. Adding a new field `type` here (rare) is the only engine change
 * ever required by new categories.
 */
export default function DynamicFieldRenderer({ fields = [], values = {}, onChange, className }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {fields.map((field) => {
        const value = values[field.name];
        const set = (val) => onChange(field.name, val);
        const span2 = field.type === FIELD_TYPES.TEXTAREA || field.type === FIELD_TYPES.MULTISELECT;

        return (
          <FieldShell key={field.name} field={field} className={span2 ? "sm:col-span-2" : undefined}>
            {field.type === FIELD_TYPES.TEXT && (
              <Input value={value ?? ""} placeholder={field.placeholder} disabled={field.readOnly} onChange={(e) => set(e.target.value)} />
            )}
            {field.type === FIELD_TYPES.TEXTAREA && (
              <Textarea value={value ?? ""} placeholder={field.placeholder} disabled={field.readOnly} onChange={(e) => set(e.target.value)} rows={3} />
            )}
            {field.type === FIELD_TYPES.NUMBER && (
              <QuantityInput value={value} min={field.min} max={field.max} disabled={field.readOnly} onChange={set} />
            )}
            {field.type === FIELD_TYPES.CURRENCY && (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  type="number"
                  className="pl-6"
                  value={value ?? ""}
                  disabled={field.readOnly}
                  onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            )}
            {field.type === FIELD_TYPES.SELECT && (
              <Select value={value || undefined} onValueChange={set} disabled={field.readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.type === FIELD_TYPES.MULTISELECT && (
              <MultiSelectField options={field.options || []} value={value || []} onChange={set} />
            )}
            {field.type === FIELD_TYPES.TAGS && <TagsInput value={value || []} onChange={set} />}
            {field.type === FIELD_TYPES.DATE && <DateField value={value} onChange={set} />}
            {field.type === FIELD_TYPES.RADIO && <RadioField field={field} value={value} onChange={set} />}
            {field.type === FIELD_TYPES.TOGGLE && (
              <div className="flex h-10 items-center">
                <Switch checked={!!value} onCheckedChange={set} disabled={field.readOnly} />
              </div>
            )}
            {field.type === FIELD_TYPES.FILE && <AttachmentUploader value={value || []} onChange={set} />}
          </FieldShell>
        );
      })}
    </div>
  );
}
