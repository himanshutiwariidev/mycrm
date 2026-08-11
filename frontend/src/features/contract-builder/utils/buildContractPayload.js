import { generateProjectDescription } from "./generateProjectDescription";
import { generateProjectScope } from "./generateProjectScope";
import { flattenDeliverables } from "./flattenDeliverables";
import { computeContractTaxSummary } from "../config/pricing";

/**
 * Wizard state -> legacy-compatible backend payload. projectDescription /
 * projectScope / deliverables are auto-generated from selectedServices so
 * the existing email template, invoice PDF, and deliverable tracking (which
 * all read those exact fields) keep working unchanged; selectedServices /
 * pricingSummary are stored as-is for the new rich UI.
 */
export function buildContractPayload(state) {
  const enabledCategories = state.selectedServices.filter((c) => c.enabled && c.selections?.length);
  const amountReceived = Number(state.meta.amountReceived) || 0;
  // Only a brand-new contract (no id yet) should seed a payment from this
  // field — on edit/autosave updateContract spreads the payload directly
  // into the document, so sending `payments` there would blindly overwrite
  // whatever real payment history has since been recorded via the Payments tab.
  const isNewContract = !state.meta.contractId;

  const { baseAmount, gstEnabled, gstPercent, gstAmount, finalAmount, tdsEnabled, tdsPercent, tdsAmount } =
    computeContractTaxSummary(state.meta);

  return {
    clientId: state.meta.clientId,
    projectName: state.meta.projectName,
    projectDescription: generateProjectDescription(enabledCategories),
    projectScope: generateProjectScope(enabledCategories),
    deliverables: flattenDeliverables(enabledCategories),
    timeline: state.meta.timeline,
    contractStartDate: state.meta.contractStartDate || undefined,
    // The contract amount is entered directly on Step 1 — authoritative, not
    // derived from the itemized per-service pricing (which remains available
    // as an internal cost breakdown but doesn't have to sum to this total).
    // projectAmount is the final, GST-inclusive total (equal to preTaxAmount
    // when GST isn't enabled) since that's the actual amount owed/collected —
    // TDS never factors in here, it's tracked separately for admin records only.
    preTaxAmount: baseAmount,
    projectAmount: finalAmount,
    gstEnabled,
    gstPercent,
    gstAmount,
    tdsEnabled,
    tdsPercent,
    tdsAmount,
    currency: state.meta.currency || "INR",
    paymentMethod: state.meta.paymentMethod || "Cash",
    paymentTerms: state.meta.paymentTerms,
    validUntil: state.meta.validUntil || undefined,
    nextDueDate: state.meta.dueDate || undefined,
    notes: state.meta.notes,
    selectedServices: enabledCategories,
    pricingSummary: state.pricingSummary,
    // Recorded as a real payment so the Payments tab / receivedAmount stay in
    // sync with what was entered here, instead of a separate untracked number.
    // paymentDate defaults to today but is editable specifically so a
    // backdated contract's initial payment lands in the month it was actually
    // received (e.g. January), not the month the contract was entered into
    // the system — otherwise Payment Overview would misattribute it.
    ...(isNewContract && amountReceived > 0
      ? { payments: [{ amount: amountReceived, method: state.meta.paymentMethod || "Other", paymentDate: state.meta.paymentDate || undefined, notes: "Recorded at contract creation" }] }
      : {}),
    // Editing an existing contract's Amount Received is a direct, free-form
    // override of the stored total — deliberately NOT a new payment record,
    // since there's no way to know which individual payment (if any) the admin
    // meant to correct. This can drift from the sum of the real payments
    // listed in the Payments tab. updateContract's findByIdAndUpdate persists
    // these as-is; only contract.save() (used by add/delete payment) recomputes
    // them from the payments ledger, so a later payment change will still
    // override this value back to the ledger's true total.
    ...(!isNewContract
      ? { receivedAmount: amountReceived, dueAmount: Math.max(finalAmount - amountReceived, 0) }
      : {}),
  };
}
