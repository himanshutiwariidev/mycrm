import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEP_LABELS = [
  "Client Details",
  "Select Services",
  "Configure Services",
  "Review Contract",
  "Generate Contract",
];

export default function StepIndicator({ currentStep, onStepClick, furthestStep, isEdit }) {
  // Step 5's pill must match whatever the actual submit button at the bottom
  // of the page says ("Update Contract" when editing) — otherwise the page
  // shows two differently-labeled "Generate Contract"/"Update Contract"
  // controls and clicking the (inert, already-current-step) pill up here
  // looks like a broken submit button.
  const labels = isEdit
    ? [...STEP_LABELS.slice(0, 4), "Update Contract"]
    : STEP_LABELS;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {labels.map((label, index) => {
        const step = index + 1;
        const isComplete = step < currentStep;
        const isActive = step === currentStep;
        const isReachable = step <= furthestStep;

        return (
          <React.Fragment key={label}>
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepClick(step)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive && "bg-primary text-primary-foreground",
                !isActive && isComplete && "text-primary hover:bg-accent",
                !isActive && !isComplete && "text-muted-foreground",
                !isReachable && "cursor-not-allowed opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  isActive && "bg-primary-foreground text-primary",
                  !isActive && isComplete && "bg-primary text-primary-foreground",
                  !isActive && !isComplete && "border border-current"
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {step < STEP_LABELS.length && (
              <div className="h-px w-4 shrink-0 bg-border sm:w-8">
                {isComplete && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="h-px origin-left bg-primary"
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
