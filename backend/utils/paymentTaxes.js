/**
 * One contract payment, with optional GST / TDS, worked out from what the
 * admin entered. Used when adding a payment and for the payment recorded when
 * a contract is created. Mirrors splitPayment() in
 * frontend/src/components/PaymentManager.jsx and computeReceivedSplit() in
 * the contract builder's config/pricing.js.
 *
 * From the entered amount A:
 *   GST excluded → taxable = A, GST = A × g% on top       (invoice = A + GST)
 *   GST included → GST = A × g / (100 + g) inside A, taxable = A − GST (invoice = A)
 *   TDS = taxable × t%
 *   TDS excluded → the client paid the invoice and the TDS is added on top
 *   TDS included → the client deducted the TDS from the invoice
 *
 * What counts against the contract's due (`amount`):
 *   - the GST part only when the contract's own value includes GST — a
 *     contract written without GST is settled by the taxable value, and the
 *     GST collected is recorded separately (gstCounted: false);
 *   - TDS counts as received (the client pays it to the government for us);
 *   - a payment received WITHOUT GST (e.g. cash) on a contract that has GST
 *     comes off the amount before GST, so the GST on that part is never
 *     charged: it counts as amount + GST% (`gstNotCharged`). ₹1,01,000 + 18%
 *     GST = ₹1,19,180; ₹6,000 cash → ₹95,000 + GST = ₹1,12,100 left.
 * `bankAmount` is what actually reached the bank (or the cash in hand).
 */

const round2 = (n) => Math.round(n * 100) / 100;

/** A real calendar date (a half-typed date input can send e.g. "0001-01-01"). */
function sensibleDate(value) {
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100;
}

function readTax(on, value, modeValue, label) {
  if (on !== true && on !== "true") return { percent: 0 };
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return { error: `Enter a ${label} % between 0 and 100` };
  const mode = modeValue === undefined || modeValue === null || modeValue === "" ? "excluded" : modeValue;
  if (!["excluded", "included"].includes(mode)) return { error: `${label} must be included or excluded` };
  return { percent, mode };
}

/**
 * @param body  { amount, paymentDate, method, notes, gstEnabled, gstPercent, gstMode, tdsEnabled, tdsPercent, tdsMode, withoutGst }
 * @param opts  { contractHasGst, contractGstPercent } — the contract's own GST
 * @returns { payment } ready to push onto contract.payments, or { error }
 */
function buildPayment(body, { contractHasGst, contractGstPercent }) {
  const entered = Number(body.amount);
  if (body.amount === undefined || body.amount === null || body.amount === "" || !Number.isFinite(entered) || entered <= 0) {
    return { error: "Amount is required" };
  }
  if (body.paymentDate && !sensibleDate(body.paymentDate)) return { error: "Enter a valid payment date" };

  const gst = readTax(body.gstEnabled, body.gstPercent, body.gstMode, "GST");
  if (gst.error) return gst;
  const tds = readTax(body.tdsEnabled, body.tdsPercent, body.tdsMode, "TDS");
  if (tds.error) return tds;
  // Only means something on a contract whose value includes GST.
  const contractGst = contractHasGst ? Number(contractGstPercent) || 0 : 0;
  const withoutGst = contractGst > 0 && (body.withoutGst === true || body.withoutGst === "true");
  if (withoutGst && gst.percent) return { error: "A payment received without GST can't have GST on it" };

  const gstAmount = gst.percent
    ? round2(gst.mode === "included" ? (entered * gst.percent) / (100 + gst.percent) : (entered * gst.percent) / 100)
    : 0;
  const taxable = gst.percent && gst.mode === "included" ? round2(entered - gstAmount) : entered;
  const invoice = round2(taxable + gstAmount);
  const tdsAmount = tds.percent ? round2((taxable * tds.percent) / 100) : 0;
  const settled = tds.percent && tds.mode === "excluded" ? invoice + tdsAmount : invoice;
  const bankAmount = tds.percent && tds.mode === "included" ? invoice - tdsAmount : invoice;
  const gstCounted = !!contractHasGst;
  const gstNotCharged = withoutGst ? round2((settled * contractGst) / 100) : 0;
  const amount = round2(settled - (gstCounted ? 0 : gstAmount) + gstNotCharged);

  const taxed = gst.percent || tds.percent || gstNotCharged;
  return {
    payment: {
      amount,
      paymentDate: body.paymentDate || undefined,
      method: body.method,
      notes: body.notes,
      ...(taxed ? { taxableAmount: taxable, bankAmount: round2(bankAmount) } : {}),
      ...(gst.percent ? { gstPercent: gst.percent, gstAmount, gstMode: gst.mode, gstCounted } : {}),
      ...(tds.percent ? { tdsPercent: tds.percent, tdsAmount, tdsMode: tds.mode } : {}),
      ...(gstNotCharged ? { gstNotCharged } : {}),
    },
  };
}

const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** "₹59,000 received (GST 18% ₹9,000 included, not counted)…" — for the activity log. */
function describePayment(p) {
  const bank = p.bankAmount ?? p.amount;
  const parts = [
    p.gstNotCharged ? `without GST, ${inr(p.gstNotCharged)} GST not charged on it` : "",
    p.gstAmount ? `GST ${p.gstPercent}% ${inr(p.gstAmount)} ${p.gstMode === "included" ? "included" : "added"}${p.gstCounted === false ? ", not counted toward the contract" : ""}` : "",
    p.tdsAmount ? `TDS ${p.tdsPercent}% ${inr(p.tdsAmount)} ${p.tdsMode === "included" ? "deducted" : "added"}` : "",
  ].filter(Boolean);
  if (!parts.length) return `Payment of ${inr(p.amount)}`;
  return `Payment of ${inr(bank)} received (${parts.join("; ")}) — ${inr(p.amount)} counted`;
}

/**
 * Money actually collected for a payment, for collection / revenue totals —
 * `amount` minus the GST that was never charged (a cash payment of ₹6,000 on
 * a GST contract counts ₹7,080 toward the due but only ₹6,000 was collected).
 */
const collectedOf = (p) => round2((p?.amount || 0) - (p?.gstNotCharged || 0));

/** What a contract wrote off as bad debt (comes off the due, never collected). */
const writtenOffOf = (contract) => contract?.badDebt?.amount || 0;

module.exports = { buildPayment, describePayment, collectedOf, writtenOffOf, sensibleDate, round2, inr };
