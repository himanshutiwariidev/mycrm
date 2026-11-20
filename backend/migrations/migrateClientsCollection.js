// One-time move of CRM clients from the shared "clients" collection to the
// CRM's own "crmClients" collection (see the note at the bottom of
// models/Client.js for why).
//
//   npm run migrate:clients                 dry run — shows what would happen
//   npm run migrate:clients -- --apply      copy clients (same _id → all links keep working)
//   npm run migrate:clients -- --cleanup    then remove the old copies from "clients"
//
// Safe to run more than once: clients already copied are skipped, and any
// that were edited in the old collection afterwards (e.g. by a server still
// running the old code) are updated. Documents that belong to the other
// product (they carry a tenantId) are never copied, changed or deleted.
//
// Production: deploy the new code, run with --apply straight away, check the
// app, then run --cleanup when happy. Works on any database MONGO_URI points at.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

const OLD = "clients";
const NEW = "crmClients";
// CRM clients never have a tenantId; the other product's always do.
const CRM_ONLY = { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] };

const apply = process.argv.includes("--apply");
const cleanup = process.argv.includes("--cleanup");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`Database: ${db.databaseName}${apply || cleanup ? "" : "  (dry run — add --apply to copy)"}`);

    if (!(await db.listCollections({ name: OLD }).toArray()).length) {
      console.log(`No "${OLD}" collection — nothing to migrate.`);
      return;
    }
    const source = db.collection(OLD);
    const target = db.collection(NEW);

    const docs = await source.find(CRM_ONLY).toArray();
    const otherProduct = await source.countDocuments({ tenantId: { $exists: true, $ne: null } });
    const existing = new Map(
      (await target.find({ _id: { $in: docs.map((d) => d._id) } }).project({ updatedAt: 1 }).toArray())
        .map((d) => [String(d._id), d.updatedAt])
    );
    const toCopy = docs.filter((d) => !existing.has(String(d._id)));
    const toRefresh = docs.filter((d) => {
      const copiedAt = existing.get(String(d._id));
      return copiedAt && d.updatedAt && new Date(d.updatedAt) > new Date(copiedAt);
    });

    console.log(`"${OLD}": ${docs.length} CRM client(s), ${otherProduct} other-product document(s) (left untouched)`);
    console.log(`"${NEW}": ${existing.size} already copied · ${toCopy.length} to copy · ${toRefresh.length} edited since copy`);

    if (apply) {
      if (toCopy.length) {
        try {
          await target.insertMany(toCopy, { ordered: false });
        } catch (error) {
          // A clash here means a client with the same email was created in
          // the new collection meanwhile — report it instead of overwriting.
          const failed = (error.writeErrors || []).map((e) => e.err?.op?.clientName || e.errmsg);
          console.error(`⚠ ${failed.length} client(s) not copied:`, failed);
        }
      }
      for (const doc of toRefresh) await target.replaceOne({ _id: doc._id }, doc);
      // Make sure the CRM's own indexes (e.g. unique email, sparse) exist.
      const Client = require("../models/Client");
      await Client.createIndexes();
      console.log(`✓ Copied ${toCopy.length}, refreshed ${toRefresh.length}. "${NEW}" now has ${await target.countDocuments()} client(s).`);
    }

    if (cleanup) {
      // Only delete originals that are confirmed present in the new collection.
      const copiedIds = (await target.find({ _id: { $in: docs.map((d) => d._id) } }).project({ _id: 1 }).toArray()).map((d) => d._id);
      const missing = docs.length - copiedIds.length;
      if (missing) {
        console.error(`✖ ${missing} client(s) aren't in "${NEW}" yet — run with --apply first. Nothing deleted.`);
        process.exitCode = 1;
        return;
      }
      const { deletedCount } = await source.deleteMany({ _id: { $in: copiedIds }, ...CRM_ONLY });
      console.log(`✓ Removed ${deletedCount} old copies from "${OLD}" (other product's documents untouched).`);
    }
  } catch (error) {
    console.error("Client migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
