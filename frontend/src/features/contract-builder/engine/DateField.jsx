import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DateField({ value, onChange, placeholder = "Pick a date" }) {
  const dateValue = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {/* "30 Sep 2026" — short enough for the narrow date boxes in the
              builder's one-row layout, and the same style as the summary. */}
          <span className="truncate">{dateValue ? format(dateValue, "d MMM yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={dateValue}
          // Month + year dropdowns so backdated dates (e.g. March 2024) don't
          // need dozens of clicks through the month arrows.
          captionLayout="dropdown"
          defaultMonth={dateValue}
          startMonth={new Date(2015, 0)}
          endMonth={new Date(new Date().getFullYear() + 10, 11)}
          onSelect={(date) => onChange(date ? date.toISOString() : "")}
        />
      </PopoverContent>
    </Popover>
  );
}
