import React from "react";
import ServiceAccordion from "../engine/ServiceAccordion";
import { useContractWizard } from "../context/useContractWizard";

export default function Step3ConfigureServices() {
  const { state } = useContractWizard();
  const errors = state.validation.errorsByStep[3]?.errorsByPath;
  const errorPaths = errors ? Object.keys(errors) : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Configure each selected service</h2>
        <p className="text-sm text-muted-foreground">
          Expand a category, enable the sub-services you need, and fill in quantities, pricing and notes.
        </p>
      </div>
      {errorPaths.length > 0 && (
        <p className="text-sm text-destructive">
          Please fix the highlighted fields in: {errorPaths.join(", ")}
        </p>
      )}
      <ServiceAccordion />
    </div>
  );
}
