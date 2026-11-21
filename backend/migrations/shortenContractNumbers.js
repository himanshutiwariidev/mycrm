/**
 * Renames existing long contract numbers ("CONTRACT-1795254992293-968") to the
 * short format new contracts get: brand initials + date + time (IST) of when
 * the contract was created, e.g. "HT2011261653" (see utils/contractNumber.js).
 * Also updates the contract number mentioned in its auto-created tasks.
 *
 *   npm run migrate:contract-numbers            # dry run: shows old → new
 *   npm run migrate:contract-numbers -- --apply # renames
 *
 * Note: PDFs / emails already sent keep showing the old number.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const Client = require("../models/Client");
const Task = require("../models/Task");
const { contractNumberFor } = require("../utils/contractNumber");

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);

  const old = await Contract.find({ contractNumber: /^CONTRACT-/ }).select("contractNumber clientId createdAt").sort({ createdAt: 1 });
  const clients = new Map(
    (await Client.find({ _id: { $in: old.map((c) => c.clientId) } }).select("companyName clientName").lean()).map((c) => [String(c._id), c])
  );
  const taken = new Set((await Contract.distinct("contractNumber")).map(String));

  let renamed = 0;
  for (const contract of old) {
    const client = clients.get(String(contract.clientId));
    const base = contractNumberFor(client?.companyName || client?.clientName, contract.createdAt || contract._id.getTimestamp());
    let next = base;
    for (let n = 2; taken.has(next); n += 1) next = `${base}-${n}`;
    taken.add(next);
    console.log(`${apply ? "✓" : "·"} ${contract.contractNumber} → ${next}  (${client?.companyName || client?.clientName || "unknown client"})`);
    if (apply) {
      const previous = contract.contractNumber;
      await Contract.updateOne({ _id: contract._id }, { $set: { contractNumber: next } });
      const tasks = await Task.find({ contractId: contract._id, description: { $regex: previous } }).select("description");
      for (const task of tasks) {
        await Task.updateOne({ _id: task._id }, { $set: { description: task.description.split(previous).join(next) } }, { timestamps: false });
      }
    }
    renamed += 1;
  }
  console.log(`\n${apply ? "Renamed" : "Would rename"} ${renamed} contract(s).${apply || !renamed ? "" : " Run with --apply to rename."}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
