import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuantityInput({ value, onChange, min = 0, max, disabled }) {
  const numeric = value === "" || value === undefined || value === null ? 0 : Number(value);

  const step = (delta) => {
    const next = numeric + delta;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || (min !== undefined && numeric <= min)}
        onClick={() => step(-1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="h-9 w-20 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || (max !== undefined && numeric >= max)}
        onClick={() => step(1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
