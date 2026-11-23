/**
 * Cash payments on a contract whose value includes GST used to count at face
 * value — ₹6,000 cash on ₹1,01,000 + 18% GST (₹1,19,180) left ₹1,13,180 due.
 * Cash is received without GST, so it comes off the amount before GST and the
 * GST on it is never charged: ₹95,000 + GST = ₹1,12,100 due
 * (utils/paymentTaxes.js, `gstNotCharged`).
 *
 * This recounts the cash payments already saved on GST contracts that way.
 * Cash payments that recorded GST on them, and payments by any other method,
 * are left exactly as they are.
 *
 *   npm run migrate:cash-without-gst            # dry run: shows before → after
 *   npm run migrate:cash-without-gst -- --apply # saves
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const { round2, inr } = require("../utils/paymentTaxes");

const isUnset = (v) => v === undefined || v === null;

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);

  const contracts = await Contract.find({
    gstEnabled: true,
    gstPercent: { $gt: 0 },
    payments: { $elemMatch: { method: "Cash", gstAmount: { $not: { $gt: 0 } }, gstNotCharged: { $exists: false } } },
  });

  let changed = 0;
  const skipped = [];
  for (const contract of contracts) {
    const g = Number(contract.gstPercent) || 0;
    const before = { received: contract.receivedAmount, due: contract.dueAmount };
    const lines = [];
    for (const p of contract.payments) {
      if (p.method !== "Cash" || p.gstAmount > 0 || !isUnset(p.gstNotCharged)) continue;
      const tds = p.tdsAmount || 0;
      // A TDS payment saved before bankAmount existed needs migrate:gst-payments first.
      if (tds > 0 && isUnset(p.bankAmount)) {
        skipped.push(`${contract.contractNumber} — ${inr(p.amount)} on ${new Date(p.paymentDate).toLocaleDateString("en-IN")}`);
        continue;
      }
      const settled = p.amount || 0;
      if (isUnset(p.bankAmount)) p.bankAmount = settled;
      if (isUnset(p.taxableAmount)) p.taxableAmount = round2(settled - (p.tdsMode === "excluded" ? tds : 0));
      p.gstNotCharged = round2((settled * g) / 100);
      p.amount = round2(settled + p.gstNotCharged);
      lines.push(`    ${new Date(p.paymentDate).toLocaleDateString("en-IN")}  ${inr(p.bankAmount)} cash · GST ${g}% not charged ${inr(p.gstNotCharged)} · counted ${inr(settled)} → ${inr(p.amount)}`);
    }
    if (!lines.length) continue;
    changed += 1;
    if (apply) await contract.save(); // recomputes received / due
    const counted = round2(contract.payments.reduce((s, p) => s + (p.amount || 0), 0));
    const due = round2((contract.projectAmount || 0) - counted);
    console.log(`${apply ? "✓" : "·"} ${contract.contractNumber}  "${contract.projectName}"  (${inr(contract.preTaxAmount ?? contract.projectAmount)} + ${g}% GST = ${inr(contract.projectAmount)})`);
    console.log(lines.join("\n"));
    console.log(`    due ${inr(before.due)} → ${inr(due)}   (received stays ${inr(before.received)})\n`);
  }
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} cash payment(s) with TDS — run "npm run migrate:gst-payments -- --apply" first, then this again:`);
    console.log(skipped.map((s) => `    ${s}`).join("\n") + "\n");
  }
  console.log(`${apply ? "Updated" : "Would update"} ${changed} contract(s).${apply || !changed ? "" : " Run with --apply to save."}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
