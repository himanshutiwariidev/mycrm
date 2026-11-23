/**
 * Payments recorded with GST before 23 Nov 2026 counted their GST toward the
 * contract even when the contract's value was written WITHOUT GST — so e.g. a
 * ₹59,000 cheque (₹50,000 + ₹9,000 GST) took ₹59,000 off a ₹1,01,000
 * contract and the due came out wrong (often negative).
 *
 * This recounts those payments the way new ones are counted
 * (utils/paymentTaxes.js): on a contract without GST only the taxable value
 * counts and the GST is kept as a record. It also stores what reached the
 * bank. Payments without a GST/TDS split are left exactly as they are.
 *
 *   npm run migrate:gst-payments            # dry run: shows before → after
 *   npm run migrate:gst-payments -- --apply # saves
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Contract = require("../models/Contract");

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round(n * 100) / 100;

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);

  // Taxed payments saved before bankAmount existed.
  const contracts = await Contract.find({
    payments: { $elemMatch: { $or: [{ gstAmount: { $gt: 0 } }, { tdsAmount: { $gt: 0 } }], bankAmount: { $exists: false } } },
  });

  let changed = 0;
  for (const contract of contracts) {
    const before = { received: contract.receivedAmount, due: contract.dueAmount };
    const lines = [];
    for (const p of contract.payments) {
      if (p.bankAmount !== undefined && p.bankAmount !== null) continue;
      if (!(p.gstAmount > 0) && !(p.tdsAmount > 0)) continue;
      const oldAmount = p.amount;
      const gst = p.gstAmount || 0;
      const tds = p.tdsAmount || 0;
      // Before: amount = invoice (+ TDS when it was "added on top"); the bank got amount − TDS.
      p.bankAmount = round2(oldAmount - tds);
      if (p.taxableAmount === undefined || p.taxableAmount === null) p.taxableAmount = round2(oldAmount - gst - (p.tdsMode === "excluded" ? tds : 0));
      if (gst > 0) {
        p.gstCounted = !!contract.gstEnabled;
        if (!contract.gstEnabled) p.amount = round2(oldAmount - gst);
      }
      lines.push(`    ${new Date(p.paymentDate).toLocaleDateString("en-IN")}  ${inr(p.bankAmount)} received · GST ${inr(gst)} · counted ${inr(oldAmount)} → ${inr(p.amount)}`);
    }
    if (!lines.length) continue;
    changed += 1;
    if (apply) await contract.save(); // recomputes received / due
    const received = round2(contract.payments.reduce((s, p) => s + (p.amount || 0), 0));
    const due = round2((contract.projectAmount || 0) - received);
    console.log(`${apply ? "✓" : "·"} ${contract.contractNumber}  "${contract.projectName}"  (${contract.gstEnabled ? "value incl. GST" : "value without GST"}, total ${inr(contract.projectAmount)})`);
    console.log(lines.join("\n"));
    console.log(`    received ${inr(before.received)} → ${inr(received)}   due ${inr(before.due)} → ${inr(due)}\n`);
  }
  console.log(`${apply ? "Updated" : "Would update"} ${changed} contract(s).${apply || !changed ? "" : " Run with --apply to save."}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
