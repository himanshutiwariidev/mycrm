import React from "react";
import { IndianRupee } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import DateField from "../engine/DateField";
import { useContractWizard } from "../context/useContractWizard";
import { formatCurrency, computeContractTaxSummary, computeReceivedSplit, receivedAmountFor } from "../config/pricing";
import { Field, MoneyInput, QuickChips, SectionCard, SECTION_IDS } from "./ui";

const PAYMENT_METHODS = ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "P Account", "Other"];

/**
 * GST / TDS: the switch sits on the label line; the % box only appears when
 * it's on, with the resulting amount shown inside the same box.
 */
function TaxField({ id, label, info, enabled, onToggle, percent, onPercent, amountText, error }) {
  const switchId = `${id}-switch`;
  const toggle = (checked) => {
    onToggle(!!checked);
    // Jump straight into the % box when the tax is switched on.
    if (checked) requestAnimationFrame(() => document.getElementById(id)?.focus());
  };
  const empty = !(Number(percent) > 0);
  return (
    <Field
      label={label}
      htmlFor={enabled ? id : switchId}
      info={info}
      error={error}
      labelRight={<Switch id={switchId} aria-label={`Apply ${label}`} checked={enabled} onCheckedChange={toggle} className="scale-90" />}
    >
      {enabled ? (
        <div className={cn(
          "flex h-10 items-center gap-1.5 rounded-md border bg-background px-3 shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          error ? "border-destructive" : "border-input"
        )}>
          <input
            id={id}
            type="number" min="0" max="100" inputMode="decimal"
            value={percent}
            onChange={(e) => onPercent(e.target.value)}
            placeholder="0"
            aria-label={`${label} percent`}
            className="w-10 min-w-0 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <span className={cn("ml-auto truncate text-[11.5px] tabular-nums", empty ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")} title={empty ? undefined : amountText}>
            {empty ? "Enter %" : amountText}
          </span>
        </div>
      ) : (
        <label htmlFor={switchId} className="flex h-10 cursor-pointer items-center text-sm text-muted-foreground/80">
          Not applied
        </label>
      )}
    </Field>
  );
}

/**
 * Contract value, tax and the payment received so far. Desktop: two rows on a
 * 5-column grid — Amount · GST · TDS · Final amount (wide), then Received ·
 * Received on · Method · Due date · Balance — so the two worked-out totals
 * (final amount, balance) sit at the right end of their rows, in boxes.
 */
export default function ValueSection({ errors = {}, done }) {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const m = state.meta;
  const isEdit = !!m.contractId;
  const setField = (field, value) => dispatch({ type: ACTIONS.SET_META_FIELD, payload: { field, value } });

  const { baseAmount, gstEnabled, gstPercent, gstAmount, finalAmount, tdsAmount } = computeContractTaxSummary(m);
  // What the amount received takes off the contract (config/pricing.js):
  // received with GST on a contract without GST → without its GST part;
  // received without GST (cash) on a contract with GST → plus the GST that's
  // no longer charged on it (₹1,01,000 + GST, ₹6,000 cash → ₹95,000 + GST left).
  const received = computeReceivedSplit(m);
  const balance = Math.max(finalAmount - received.counted, 0);
  const fmt = (v) => formatCurrency(v, m.currency);
  const fmtWhole = (v) => formatCurrency(Math.round(Number(v) || 0), m.currency);
  // The 50% / Full chips fill in the amount to enter for that share of the contract.
  const chipValue = (share) => String(Math.round(receivedAmountFor(m, finalAmount * share)));
  const receivedPreset = received.entered === 0 ? "none" : chipValue(0.5) === String(Math.round(received.entered)) ? "half" : chipValue(1) === String(Math.round(received.entered)) ? "full" : null;
  const toggleReceivedGst = (checked) => setField("receivedGst", checked ? "with" : "without");
  // A contract amount before GST, for "₹95,000 + GST".
  const beforeGst = (v) => Math.round((v / (1 + gstPercent / 100)) * 100) / 100;
  // Older contracts can still carry a method that's no longer offered (e.g. "3 Parts").
  const methods = !m.paymentMethod || PAYMENT_METHODS.includes(m.paymentMethod) ? PAYMENT_METHODS : [...PAYMENT_METHODS, m.paymentMethod];

  return (
    <SectionCard id={SECTION_IDS.value} Icon={IndianRupee} title="Value & payment" subtitle="What the client pays (GST is added on top) and what's been received" done={done}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Contract Amount" htmlFor="cb-amount" required error={errors.contractAmount?.[0]}>
          <MoneyInput id="cb-amount" field="contractAmount" value={m.contractAmount} onChange={(e) => setField("contractAmount", e.target.value)} />
        </Field>
        <TaxField
          id="cb-gst" label="GST" info="Added on top of the contract amount, and applied as the GST % on every service in this contract."
          enabled={m.gstEnabled} onToggle={(v) => setField("gstEnabled", v)}
          percent={m.gstPercent} onPercent={(v) => setField("gstPercent", v)}
          amountText={fmtWhole(gstAmount)} error={errors.gstPercent?.[0]}
        />
        <TaxField
          id="cb-tds" label="TDS" info="For your records only — it doesn't change the final amount."
          enabled={m.tdsEnabled} onToggle={(v) => setField("tdsEnabled", v)}
          percent={m.tdsPercent} onPercent={(v) => setField("tdsPercent", v)}
          amountText={fmtWhole(tdsAmount)} error={errors.tdsPercent?.[0]}
        />
        <Field label={m.gstEnabled ? "Final Amount (incl. GST)" : "Final Amount"} className="xl:col-span-2">
          <div className="flex h-10 items-center justify-between gap-3 rounded-md border border-primary/25 bg-primary/5 px-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {m.gstEnabled && baseAmount ? `${fmt(baseAmount)} + ${fmt(gstAmount)} GST` : m.gstEnabled ? "" : "No GST"}
            </span>
            <span className="shrink-0 text-base font-bold tabular-nums text-primary">{fmt(finalAmount)}</span>
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-1 sm:col-span-2 xl:col-span-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Field
          // Shorter while the GST switch shares the label line.
          label={isEdit ? "Amount Received" : "Received"} htmlFor="cb-received"
          info={isEdit ? "Overrides the received total — individual payments stay in the Payments tab." : undefined}
          error={!isEdit ? errors.amountReceived?.[0] : null}
          labelRight={!isEdit && (
            <span className="flex shrink-0 items-center gap-1" title="On: this amount includes GST (e.g. cheque / UPI against a GST bill). Off: received without GST (e.g. cash) — on a contract with GST it comes off the amount before GST.">
              <span className={cn("text-[11.5px]", received.withGst ? "font-medium text-primary" : "text-muted-foreground")}>GST</span>
              <Switch
                id="cb-received-gst"
                data-field="receivedWithGst"
                aria-label="Amount received with GST"
                checked={received.withGst}
                onCheckedChange={toggleReceivedGst}
                className="scale-90"
              />
            </span>
          )}
          hint={(finalAmount > 0 || received.gstAmount > 0 || received.gstNotCharged > 0) && (
            <div className="space-y-1">
              {finalAmount > 0 && (
                <QuickChips items={[
                  { label: "None", active: receivedPreset === "none", onClick: () => setField("amountReceived", "") },
                  { label: "50%", active: receivedPreset === "half", onClick: () => setField("amountReceived", chipValue(0.5)) },
                  { label: "Full", active: receivedPreset === "full", onClick: () => setField("amountReceived", chipValue(1)) },
                ]} />
              )}
              {received.gstAmount > 0 && (
                <p data-field="receivedSplit" className="leading-snug">
                  {fmt(received.taxable)} + {fmt(received.gstAmount)} GST
                  {!gstEnabled && <> · <span className="font-medium text-foreground">{fmt(received.counted)}</span> counts toward the contract</>}
                </p>
              )}
              {!isEdit && received.gstNotCharged > 0 && (
                <p data-field="receivedNoGst" className="leading-snug">
                  Without GST · {fmt(received.gstNotCharged)} GST not charged on it · <span className="font-medium text-foreground">{fmt(received.counted)}</span> comes off
                </p>
              )}
            </div>
          )}
        >
          {received.withGst && !gstEnabled ? (
            <div className="flex gap-1.5">
              <div className="min-w-0 flex-1">
                <MoneyInput id="cb-received" field="amountReceived" value={m.amountReceived} onChange={(e) => setField("amountReceived", e.target.value)} />
              </div>
              <div className="flex h-10 w-[76px] shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <input
                  type="number" min="0" max="100" inputMode="decimal"
                  data-field="receivedGstPercent"
                  aria-label="GST % included in the amount received"
                  value={m.receivedGstPercent}
                  onChange={(e) => setField("receivedGstPercent", e.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <MoneyInput id="cb-received" field="amountReceived" value={m.amountReceived} onChange={(e) => setField("amountReceived", e.target.value)} />
          )}
        </Field>
        {!isEdit && (
          <Field label="Received On">
            <DateField value={m.paymentDate} onChange={(value) => setField("paymentDate", value)} placeholder="Payment date" />
          </Field>
        )}
        <Field label="Payment Method" className={isEdit ? "xl:col-span-2" : undefined}>
          <Select
            value={m.paymentMethod}
            onValueChange={(value) => {
              setField("paymentMethod", value);
              // Back to "decided by the method": cash → without GST.
              if (!isEdit) setField("receivedGst", null);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              {methods.map((pm) => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Balance Due Date">
          <DateField value={m.dueDate} onChange={(value) => setField("dueDate", value)} placeholder="Due date" />
        </Field>
        <Field label="Balance" hint={gstEnabled && gstPercent > 0 && balance > 0 ? <span data-field="balanceBeforeGst">{fmt(beforeGst(balance))} + GST</span> : undefined}>
          <div
            data-field="balance"
            className={cn(
              "flex h-10 items-center justify-end rounded-md border px-3 text-[15px] font-bold tabular-nums",
              balance > 0
                ? "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                : finalAmount > 0
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-input bg-muted/40 text-muted-foreground"
            )}
            title={fmt(balance)}
          >
            <span className="truncate">{balance === 0 && finalAmount > 0 ? "Fully paid" : fmt(balance)}</span>
          </div>
        </Field>
      </div>
    </SectionCard>
  );
}
