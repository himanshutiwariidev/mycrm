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
    paymentTerms: state.meta.paymentTerms,
    validUntil: state.meta.validUntil || undefined,
    nextDueDate: state.meta.dueDate || undefined,
    notes: state.meta.notes,
    selectedServices: enabledCategories,
    pricingSummary: state.pricingSummary,
    // Recorded as a real payment so the Payments tab / receivedAmount stay in
    // sync with what was entered here, instead of a separate untracked number.
    ...(isNewContract && amountReceived > 0
      ? { payments: [{ amount: amountReceived, method: state.meta.paymentMethod || "Other", notes: "Recorded at contract creation" }] }
      : {}),
  };
}
