import React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, computeContractTaxSummary } from "../config/pricing";
import { useContractWizard } from "../context/useContractWizard";

export default function Step5GenerateContract({ onSubmit }) {
  const { state } = useContractWizard();
  const currency = state.meta.currency || "INR";
  const amountReceived = Number(state.meta.amountReceived) || 0;
  const { gstEnabled, gstAmount, finalAmount } = computeContractTaxSummary(state.meta);
  const balance = Math.max(finalAmount - amountReceived, 0);
  const isEdit = !!state.meta.contractId;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Generate the contract</h2>
        <p className="text-sm text-muted-foreground">
          This creates the final contract record and makes it visible to the client in their portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Project</span>
            <span className="font-medium">{state.meta.projectName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Services Selected</span>
            <span className="font-medium">{state.selectedServices.filter((c) => c.enabled && c.selections.length).length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount Received</span>
            <span className="font-medium">{formatCurrency(amountReceived, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="font-medium">{formatCurrency(balance, currency)}</span>
          </div>
          {gstEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">GST</span>
              <span className="font-medium">{formatCurrency(gstAmount, currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-base font-semibold">{gstEnabled ? "Final Amount (incl. GST)" : "Contract Amount"}</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(finalAmount, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {state.status.error && <p className="text-sm text-destructive">{state.status.error}</p>}

      <Button size="lg" className="w-full sm:w-auto" disabled={state.status.isSubmitting} onClick={onSubmit}>
        {state.status.isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" /> {isEdit ? "Update Contract" : "Generate Contract"}
          </>
        )}
      </Button>
    </div>
  );
}
