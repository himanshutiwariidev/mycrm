/**
 * One-time backfill for month-by-month deliverable tracking.
 *
 * Before it existed, each contract-task item had a single running `delivered`
 * count. This copies that count into the item's per-period `progress` — as the
 * month the task was last updated (monthly/weekly items) or the whole contract
 * (one-time items) — exactly what the app does lazily on the first update, so
 * the month filter shows those deliveries in a fixed month from now on.
 *
 *   npm run migrate:task-progress            # dry run: shows what would change
 *   npm run migrate:task-progress -- --apply # writes the changes
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Task = require("../models/Task");
const { isPeriodic, monthKey, WHOLE_CONTRACT } = require("../utils/taskPeriods");

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const tasks = await Task.find({ "deliverables.0": { $exists: true } });
  let tasksChanged = 0;
  let itemsChanged = 0;
  for (const task of tasks) {
    let changed = false;
    for (const item of task.deliverables) {
      if (item.progress?.length || !item.delivered) continue;
      const period = isPeriodic(item.frequency) ? monthKey(task.updatedAt || task.createdAt) : WHOLE_CONTRACT;
      console.log(`${apply ? "✓" : "·"} ${task.title} — ${item.title}: ${item.delivered} → ${period}`);
      item.progress = [{ period, delivered: item.delivered }];
      itemsChanged += 1;
      changed = true;
    }
    if (changed) {
      tasksChanged += 1;
      // Keep updatedAt as-is so the month above stays what it was.
      if (apply) await task.save({ timestamps: false });
    }
  }
  console.log(`\n${apply ? "Updated" : "Would update"} ${itemsChanged} item(s) in ${tasksChanged} task(s).${apply ? "" : " Run with --apply to write."}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
