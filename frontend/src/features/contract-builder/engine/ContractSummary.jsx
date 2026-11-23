import React from "react";
import * as Icons from "lucide-react";
import { CheckCircle2, Circle, Loader2, Send, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useContractWizard } from "../context/useContractWizard";
import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "../utils/configLookup";
import { computeLeafFinalPrice, formatCurrency, computeContractTaxSummary, computeReceivedSplit } from "../config/pricing";
import { groupSharedSelections, getSharingLabel } from "../utils/contentSharing";
import { packageTypeLabel } from "../config/packageTypes";
import PackageStars from "@/components/PackageStars";

function describeQuantity(sel, categoryId) {
  const leafConfig = getLeafConfig(categoryId, sel.path);
  const itemQuantityField = (leafConfig?.fields || []).find((f) => f.type === "per-item-quantity");
  const selectedItems = itemQuantityField ? sel.values?.[itemQuantityField.sourceField] : null;
  if (itemQuantityField && Array.isArray(selectedItems) && selectedItems.length) {
    return `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}`;
  }
  return sel.values?.quantityPerMonth || sel.values?.quantity || null;
}

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null);

function Row({ label, value, strong, tone, muted }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={cn("text-muted-foreground", muted && "text-xs")}>{label}</span>
      <span className={cn("tabular-nums", strong ? "font-semibold" : "font-medium", tone, muted && "text-xs font-normal text-muted-foreground")}>{value}</span>
    </div>
  );
}

/**
 * The single-page builder's live summary (it replaces the old Review step):
 * the money, the period, every selected service with its price, a
 * "ready to generate" checklist and the Generate / Update button.
 */
export default function ContractSummary({ client, checklist = [], onJump, onGenerate, submitting }) {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const m = state.meta;
  const currency = m.currency || "INR";
  const fmt = (v) => formatCurrency(v, currency);
  const isEdit = !!m.contractId;
  const { baseAmount, gstEnabled, gstPercent, gstAmount, finalAmount, tdsEnabled, tdsPercent, tdsAmount } = computeContractTaxSummary(m);
  // Counted toward the contract (on a contract without GST, a received-with-GST amount counts without its GST).
  const { counted: received, gstAmount: receivedGst } = computeReceivedSplit(m);
  const balance = Math.max(finalAmount - received, 0);
  const { discountTotal, gstTotal, grandTotal } = state.pricingSummary;
  const enabledCategories = state.selectedServices.filter((c) => c.enabled);
  const readyCount = checklist.filter((c) => c.ok).length;
  const period = [fmtDate(m.contractStartDate), fmtDate(m.validUntil)].filter(Boolean).join(" → ");

  const removeLeaf = (categoryId, path) =>
    dispatch({ type: ACTIONS.SET_LEAF_ENABLED, payload: { categoryId, path, enabled: false } });
  const removeCategory = (categoryId) =>
    dispatch({ type: ACTIONS.TOGGLE_CATEGORY_ENABLED, payload: { categoryId, enabled: false } });

  return (
    <Card data-summary className="overflow-hidden shadow-sm">
      <div className="bg-gradient-to-br from-primary to-primary/80 px-5 py-4 text-primary-foreground">
        <p className="text-xs font-medium opacity-90">{gstEnabled ? `Final amount · incl. ${gstPercent}% GST` : "Contract amount"}</p>
        <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums">{fmt(finalAmount)}</p>
        <p className="mt-1 truncate text-xs opacity-90" title={m.projectName}>
          {m.projectName || "Untitled project"}
          {m.packageType && <> · <PackageStars packageType={m.packageType} size={11} color="#fde68a" /> {packageTypeLabel(m.packageType)}</>}
          {client?.clientName ? ` · ${client.clientName}` : ""}
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Row label="Contract amount" value={fmt(baseAmount)} />
          {gstEnabled && <Row label={`GST (${gstPercent}%)`} value={`+${fmt(gstAmount)}`} />}
          <Row label={receivedGst > 0 && !gstEnabled ? "Received (excl. GST)" : "Received"} value={fmt(received)} tone={received ? "text-emerald-600 dark:text-emerald-400" : undefined} />
          <Row label="Balance" value={fmt(balance)} strong tone={balance ? "text-amber-600 dark:text-amber-400" : undefined} />
          {tdsEnabled && <Row label={`TDS (${tdsPercent}%) · records only`} value={fmt(tdsAmount)} muted />}
          {(period || m.timeline) && (
            <div className="mt-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              {period || "Dates not set"}{m.timeline ? ` · ${m.timeline}` : ""}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Services</span>
            <span className="text-xs text-muted-foreground">{enabledCategories.length ? `${enabledCategories.length} selected` : "None yet"}</span>
          </div>
          {enabledCategories.length === 0 ? (
            <button type="button" onClick={() => onJump?.("services")} className="w-full rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground hover:border-primary hover:text-primary">
              Pick the services in this contract
            </button>
          ) : (
            // Radix wraps the viewport in a `display: table` div that grows to the
            // widest row — force it back to block so long rows truncate instead.
            <ScrollArea className="max-h-[26vh] pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
              <div className="space-y-3">
                {enabledCategories.map((cat) => {
                  const meta = getCategoryMeta(cat.categoryId);
                  const Icon = Icons[meta?.icon] || Icons.Package;
                  return (
                    <div key={cat.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{meta?.label || cat.categoryId}</span>
                        </span>
                        <button type="button" onClick={() => removeCategory(cat.categoryId)} className="text-muted-foreground hover:text-destructive" title="Remove service">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <ul className="space-y-1">
                        {groupSharedSelections(cat.selections).map(({ primary: sel, members }) => {
                          // Platforms posting the same content share one line and one combined amount.
                          const isShared = members.length > 1;
                          const price = members.reduce((sum, mm) => sum + computeLeafFinalPrice(mm.advanced).finalPrice, 0);
                          const qty = describeQuantity(sel, cat.categoryId);
                          const label = isShared ? members.map((mm) => getSharingLabel(cat.categoryId, mm.path)).join(" + ") : sel.label;
                          return (
                            <li key={sel.path} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs">
                              <span className="min-w-0">
                                <span className={isShared ? "block break-words" : "block truncate"}>
                                  {label}{qty ? <span className="text-muted-foreground"> &times;{qty}</span> : null}
                                </span>
                                {isShared && <span className="block text-[11px] text-muted-foreground">Same content on {members.length} platforms</span>}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="font-medium tabular-nums">{fmt(price)}</span>
                                <button type="button" onClick={() => members.forEach((mm) => removeLeaf(cat.categoryId, mm.path))} className="text-muted-foreground hover:text-destructive" title={`Remove ${label}`}>
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            </li>
                          );
                        })}
                        {!cat.selections.length && <li className="px-1 text-xs text-destructive">No package switched on yet</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          {grandTotal > 0 && (
            <div className="space-y-1 rounded-md border border-border px-2.5 py-2">
              <Row label="Services total" value={fmt(grandTotal)} strong />
              {(discountTotal > 0 || gstTotal > 0) && (
                <p className="text-right text-[11px] text-muted-foreground">
                  {discountTotal > 0 && `−${fmt(discountTotal)} discount`}{discountTotal > 0 && gstTotal > 0 && " · "}{gstTotal > 0 && `+${fmt(gstTotal)} GST`}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Ready to {isEdit ? "update" : "generate"}</span>
            <span className={cn("text-xs font-medium", readyCount === checklist.length ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {readyCount}/{checklist.length}
            </span>
          </div>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => onJump?.(item.key)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-muted">
                  {item.ok
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    : <Circle className={cn("h-4 w-4 shrink-0", item.error ? "text-destructive" : "text-muted-foreground/60")} />}
                  <span className={cn("min-w-0 flex-1", item.error ? "break-words" : "truncate", item.ok ? "text-foreground" : item.error ? "text-destructive" : "text-muted-foreground")}>
                    {item.error || item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Button size="lg" className="w-full" onClick={onGenerate} disabled={submitting}>
          {submitting
            ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
            : <><Send className="mr-1.5 h-4 w-4" /> {isEdit ? "Update Contract" : "Generate Contract"}</>}
        </Button>
        {!isEdit && <p className="-mt-2 text-center text-[11px] text-muted-foreground">The contract becomes visible to the client in their portal.</p>}
      </div>
    </Card>
  );
}
