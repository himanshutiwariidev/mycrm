import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PricingCalculator from "../engine/PricingCalculator";
import { useContractWizard } from "../context/useContractWizard";
import { formatCurrency, computeContractTaxSummary } from "../config/pricing";

export default function Step4ReviewContract() {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const errorMessage = state.validation.errorsByStep[4]?.message;

  const backToConfigure = () => dispatch({ type: ACTIONS.SET_STEP, payload: { step: 3 } });

  const amountReceived = Number(state.meta.amountReceived) || 0;
  const { baseAmount, gstEnabled, gstPercent, gstAmount, finalAmount, tdsEnabled, tdsPercent, tdsAmount } = computeContractTaxSummary(state.meta);
  const balance = Math.max(finalAmount - amountReceived, 0);
  const currency = state.meta.currency || "INR";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Review your contract</h2>
          <p className="text-sm text-muted-foreground">Double-check every service before generating the final contract.</p>
        </div>
        <Button variant="outline" size="sm" onClick={backToConfigure}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Services
        </Button>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Project Name</p>
            <p className="font-medium">{state.meta.projectName || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Timeline</p>
            <p className="font-medium">{state.meta.timeline || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contract Start Date</p>
            <p className="font-medium">{state.meta.contractStartDate ? new Date(state.meta.contractStartDate).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contract End Date</p>
            <p className="font-medium">{state.meta.validUntil ? new Date(state.meta.validUntil).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Terms</p>
            <p className="font-medium">{state.meta.paymentTerms || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Value</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Contract Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(baseAmount, currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount Received</p>
            <p className="text-lg font-semibold">{formatCurrency(amountReceived, currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(balance, currency)}</p>
          </div>
          {gstEnabled && (
            <div>
              <p className="text-muted-foreground">GST ({gstPercent}%)</p>
              <p className="text-lg font-semibold">{formatCurrency(gstAmount, currency)}</p>
            </div>
          )}
          {tdsEnabled && (
            <div>
              <p className="text-muted-foreground">TDS ({tdsPercent}%) <span className="text-xs">— records only</span></p>
              <p className="text-lg font-semibold">{formatCurrency(tdsAmount, currency)}</p>
            </div>
          )}
          {gstEnabled && (
            <div className="sm:col-span-3 border-t border-border pt-3">
              <p className="text-muted-foreground">Final Amount (incl. GST)</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(finalAmount, currency)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <PricingCalculator />
    </div>
  );
}
