import React from "react";
import { Paperclip, UploadCloud, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DateField from "../engine/DateField";
import { useContractWizard } from "../context/useContractWizard";
import { formatCurrency, computeContractTaxSummary } from "../config/pricing";

export default function Step1ClientDetails({ client }) {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const errors = state.validation.errorsByStep[1];
  const fieldErrors = errors?.error?.flatten?.().fieldErrors || {};
  const isEdit = !!state.meta.contractId;

  const setField = (field, value) =>
    dispatch({ type: ACTIONS.SET_META_FIELD, payload: { field, value } });

  const amountReceived = Number(state.meta.amountReceived) || 0;
  const { baseAmount, gstAmount, finalAmount, tdsAmount } = computeContractTaxSummary(state.meta);
  const balance = Math.max(finalAmount - amountReceived, 0);

  const handlePiChange = (e) => {
    const file = e.target.files?.[0] || null;
    dispatch({ type: ACTIONS.SET_PI_FILE, payload: { file } });
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {client ? (
            <>
              <Badge variant="secondary" className="text-sm">{client.clientName}</Badge>
              <span className="text-sm text-muted-foreground">{client.email}</span>
              {client.company && <span className="text-sm text-muted-foreground">&middot; {client.company}</span>}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Loading client details...</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Project Name *</Label>
            <Input
              value={state.meta.projectName}
              onChange={(e) => setField("projectName", e.target.value)}
              placeholder="e.g. Q3 Digital Growth Campaign"
            />
            {fieldErrors.projectName && (
              <p className="text-xs text-destructive">{fieldErrors.projectName[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Timeline</Label>
            <Input
              value={state.meta.timeline}
              onChange={(e) => setField("timeline", e.target.value)}
              placeholder="e.g. 3 months"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valid Until</Label>
            <DateField
              value={state.meta.validUntil}
              onChange={(value) => setField("validUntil", value)}
              placeholder="Select expiry date"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Payment Terms</Label>
            <Textarea
              value={state.meta.paymentTerms}
              onChange={(e) => setField("paymentTerms", e.target.value)}
              placeholder="e.g. 50% upfront, 50% on completion"
              rows={3}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={state.meta.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Internal notes about this contract"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Value</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Contract Amount *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                min="0"
                className="pl-7"
                value={state.meta.contractAmount}
                onChange={(e) => setField("contractAmount", e.target.value)}
                placeholder="0"
              />
            </div>
            {fieldErrors.contractAmount && (
              <p className="text-xs text-destructive">{fieldErrors.contractAmount[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Amount Received</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                min="0"
                className="pl-7"
                value={state.meta.amountReceived}
                disabled={isEdit}
                onChange={(e) => setField("amountReceived", e.target.value)}
                placeholder="0"
              />
            </div>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">Manage further payments from the Payments tab.</p>
            ) : (
              fieldErrors.amountReceived && <p className="text-xs text-destructive">{fieldErrors.amountReceived[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={state.meta.paymentMethod}
              onValueChange={(value) => setField("paymentMethod", value)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Bank Transfer">Bank</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-xs text-muted-foreground">Manage further payments from the Payments tab.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Balance</Label>
            <Input value={formatCurrency(balance, state.meta.currency)} disabled className="font-medium" />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <DateField
              value={state.meta.dueDate}
              onChange={(value) => setField("dueDate", value)}
              placeholder="Select payment due date"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-5">
            <div className="space-y-2 rounded-lg border border-input p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="gst-enabled"
                  checked={state.meta.gstEnabled}
                  onCheckedChange={(checked) => setField("gstEnabled", !!checked)}
                />
                <Label htmlFor="gst-enabled" className="cursor-pointer">Apply GST</Label>
              </div>
              {state.meta.gstEnabled && (
                <div className="flex items-center gap-3 pl-6">
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="pr-7"
                      value={state.meta.gstPercent}
                      onChange={(e) => setField("gstPercent", e.target.value)}
                      placeholder="18"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    GST Amount: <span className="font-medium text-foreground">{formatCurrency(gstAmount, state.meta.currency)}</span> — added to the final amount, and applied as the default GST % across this contract's services.
                  </p>
                </div>
              )}
              {fieldErrors.gstPercent && (
                <p className="pl-6 text-xs text-destructive">{fieldErrors.gstPercent[0]}</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-input p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tds-enabled"
                  checked={state.meta.tdsEnabled}
                  onCheckedChange={(checked) => setField("tdsEnabled", !!checked)}
                />
                <Label htmlFor="tds-enabled" className="cursor-pointer">Apply TDS</Label>
              </div>
              {state.meta.tdsEnabled && (
                <div className="flex items-center gap-3 pl-6">
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="pr-7"
                      value={state.meta.tdsPercent}
                      onChange={(e) => setField("tdsPercent", e.target.value)}
                      placeholder="10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    TDS Amount: <span className="font-medium text-foreground">{formatCurrency(tdsAmount, state.meta.currency)}</span> — for admin records only, does not affect the final amount.
                  </p>
                </div>
              )}
              {fieldErrors.tdsPercent && (
                <p className="pl-6 text-xs text-destructive">{fieldErrors.tdsPercent[0]}</p>
              )}
            </div>
          </div>

          {state.meta.gstEnabled && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Final Amount ({formatCurrency(baseAmount, state.meta.currency)} + GST {formatCurrency(gstAmount, state.meta.currency)})
                </span>
                <span className="text-base font-semibold">{formatCurrency(finalAmount, state.meta.currency)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
            <Label>Upload PI (Proforma Invoice)</Label>
            {state.piFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{state.piFile.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">({Math.ceil(state.piFile.size / 1024)} KB)</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => dispatch({ type: ACTIONS.SET_PI_FILE, payload: { file: null } })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                <UploadCloud className="h-4 w-4" />
                Click to attach the PI (PDF, image, or document)
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handlePiChange} />
              </label>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
