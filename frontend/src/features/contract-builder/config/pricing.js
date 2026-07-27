const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Final price for one leaf selection: (sellingPrice - discount%) + GST%. */
export function computeLeafFinalPrice(advanced = {}) {
  const sellingPrice = Number(advanced.sellingPrice) || 0;
  const discountPct = Number(advanced.discount) || 0;
  // GST only applies when the contract's Apply GST checkbox (Step 1) set a
  // rate on this service — no silent default, unlike the old always-on 18%.
  const gstPct = advanced.gst !== undefined && advanced.gst !== "" ? Number(advanced.gst) : 0;
  const discountAmount = (sellingPrice * discountPct) / 100;
  const afterDiscount = sellingPrice - discountAmount;
  const gstAmount = (afterDiscount * gstPct) / 100;
  return {
    discountAmount: round2(discountAmount),
    gstAmount: round2(gstAmount),
    finalPrice: round2(afterDiscount + gstAmount),
  };
}

export function computeCategorySubtotal(categorySelection) {
  return (categorySelection?.selections || []).reduce((sum, sel) => {
    const { finalPrice } = computeLeafFinalPrice(sel.advanced);
    const fallback = Number(sel.advanced?.estimatedCost) || 0;
    return sum + (finalPrice || fallback);
  }, 0);
}

/** Single source of truth for the contract grand total, used by PricingCalculator, ContractSummary and buildContractPayload. */
export function computeGrandTotal(selectedServices = []) {
  return round2(
    selectedServices
      .filter((cat) => cat.enabled)
      .reduce((sum, cat) => sum + computeCategorySubtotal(cat), 0)
  );
}

export function computePricingSummary(selectedServices = [], currency = "INR") {
  const perCategory = {};
  let discountTotal = 0;
  let gstTotal = 0;
  let grandTotal = 0;

  selectedServices
    .filter((cat) => cat.enabled)
    .forEach((cat) => {
      let subtotal = 0;
      (cat.selections || []).forEach((sel) => {
        const { discountAmount, gstAmount, finalPrice } = computeLeafFinalPrice(sel.advanced);
        const fallback = Number(sel.advanced?.estimatedCost) || 0;
        subtotal += finalPrice || fallback;
        discountTotal += discountAmount;
        gstTotal += gstAmount;
      });
      perCategory[cat.categoryId] = round2(subtotal);
      grandTotal += subtotal;
    });

  return {
    perCategory,
    discountTotal: round2(discountTotal),
    gstTotal: round2(gstTotal),
    grandTotal: round2(grandTotal),
    currency,
  };
}

/**
 * Contract-level tax summary from Step 1's Contract Value fields. GST is
 * added on top of the base amount to produce the final/payable total; TDS
 * is computed for admin record-keeping only and never touches the total.
 */
export function computeContractTaxSummary(meta = {}) {
  const baseAmount = Number(meta.contractAmount) || 0;

  const gstEnabled = !!meta.gstEnabled;
  const gstPercent = gstEnabled ? Number(meta.gstPercent) || 0 : 0;
  const gstAmount = gstEnabled ? round2((baseAmount * gstPercent) / 100) : 0;
  const finalAmount = round2(baseAmount + gstAmount);

  const tdsEnabled = !!meta.tdsEnabled;
  const tdsPercent = tdsEnabled ? Number(meta.tdsPercent) || 0 : 0;
  const tdsAmount = tdsEnabled ? round2((baseAmount * tdsPercent) / 100) : 0;

  return { baseAmount, gstEnabled, gstPercent, gstAmount, finalAmount, tdsEnabled, tdsPercent, tdsAmount };
}

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };

export function formatCurrency(amount, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const value = Number(amount) || 0;
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
