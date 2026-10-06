import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, fixedWeeks = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // Always render 6 week-rows regardless of how many weeks the current
      // month actually spans. Without this, switching to a shorter/longer
      // month changes the calendar's height, which makes the Radix Popover
      // it lives in reposition itself mid-interaction (most visible in
      // Safari) — exactly the "jumps around while picking a date" bug.
      fixedWeeks={fixedWeeks}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "flex items-center gap-1 text-sm font-medium",
        // Month/year dropdowns (captionLayout="dropdown"): the native <select>
        // sits invisibly on top of the styled label so it stays fully clickable.
        dropdowns: "flex items-center gap-2",
        dropdown_root: "relative inline-flex h-7 items-center rounded-md border border-input px-2 hover:bg-accent",
        dropdown: "absolute inset-0 w-full cursor-pointer opacity-0",
        // The nav bar spans the full width above the caption; let clicks pass
        // through its empty middle so the month/year dropdowns stay clickable.
        nav: "pointer-events-none flex items-center justify-between absolute inset-x-1 top-1 z-10",
        button_previous: cn(buttonVariants({ variant: "outline" }), "pointer-events-auto h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
        button_next: cn(buttonVariants({ variant: "outline" }), "pointer-events-auto h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
          if (orientation === "down") return <ChevronDown className="h-3.5 w-3.5 opacity-60" />;
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
