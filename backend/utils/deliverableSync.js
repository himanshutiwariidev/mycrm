const Contract = require("../models/Contract");
const { SERVICE_CATEGORY_LABELS } = require("./pricingHelpers");

/**
 * Task → Contract deliverable progress sync.
 *
 * A contract-generated Task keeps its own compact copy of the contract's
 * deliverables (see createTasksFromDeliverables in clientController). The
 * assignee/manager records progress on that copy, but the Sales and Admin
 * panels (ClientDetailPage, ContractDetail, DeliverablesTracker) read
 * Contract.deliverables — so every task-side progress change has to be
 * pushed onto the matching contract deliverable, or those panels go stale.
 */

/**
 * The contract deliverable a task item was generated from: by the stored
 * `contractDeliverableId` when present, else (tasks created before that link
 * existed) by category + title. Task item titles are the contract title with
 * its "<Category Label> — " prefix stripped, so both spellings are tried.
 */
function findContractDeliverable(contract, taskItem) {
  if (taskItem.contractDeliverableId) {
    const byId = contract.deliverables.id(taskItem.contractDeliverableId);
    if (byId) return byId;
  }
  const categoryId = taskItem.categoryId || "";
  const categoryLabel = SERVICE_CATEGORY_LABELS[taskItem.categoryId] || taskItem.categoryId || "General";
  const titles = [taskItem.title, `${categoryLabel} — ${taskItem.title}`];
  return (
    contract.deliverables.find(
      (d) => (d.categoryId || "") === categoryId && titles.includes(d.title)
    ) || null
  );
}

function statusFromProgress(delivered, quantity) {
  if (delivered <= 0) return "Pending";
  return quantity && delivered < quantity ? "In Progress" : "Completed";
}

/**
 * Applies a task item's progress change to its contract deliverable.
 *
 * Quantity-tracked contract deliverables hold a *cumulative* `delivered`
 * (compared against quantity × periods elapsed — see deliverableStats.js),
 * while the task copy is a simple 0..quantity counter. So the task's change
 * is applied as a delta (+1 / −1), never copied over, which would wipe the
 * contract's running total for recurring (monthly/weekly) deliverables.
 * Status-tracked deliverables (one-off builds, campaigns) get their status
 * derived from the task's progress instead.
 *
 * Returns { contract, deliverable } on success, or null when the task isn't
 * contract-linked or no matching contract deliverable exists.
 */
async function syncTaskProgressToContract(task, taskItem, previousDelivered, newDeliveredOverride) {
  if (!task.contractId) return null;

  // task.contractId may be populated (the progress route loads its dates).
  const contract = await Contract.findById(task.contractId._id || task.contractId);
  if (!contract) return null;

  const target = findContractDeliverable(contract, taskItem);
  if (!target) return null;

  // Self-heal legacy tasks: remember the match so later updates use the id.
  if (!taskItem.contractDeliverableId) taskItem.contractDeliverableId = target._id;

  // Monthly items pass the changed month's new count explicitly (the delta
  // between that month's old and new count is what moves the contract total).
  const newDelivered = newDeliveredOverride ?? (taskItem.delivered || 0);

  if (target.trackingMode === "status") {
    const status = statusFromProgress(newDelivered, taskItem.quantity);
    if (status !== target.status) {
      await Contract.updateOne(
        { _id: contract._id, "deliverables._id": target._id },
        { $set: { "deliverables.$.status": status } }
      );
      target.status = status;
    }
    return { contract, deliverable: target };
  }

  const delta = newDelivered - (previousDelivered || 0);
  // Never let a decrement push the contract's total below zero.
  const applied = Math.max(delta, -(target.delivered || 0));
  if (applied !== 0) {
    // Atomic $inc so two people updating the same contract at once can't
    // overwrite each other's progress.
    await Contract.updateOne(
      { _id: contract._id, "deliverables._id": target._id },
      { $inc: { "deliverables.$.delivered": applied } }
    );
    target.delivered = (target.delivered || 0) + applied;
  }
  return { contract, deliverable: target };
}

module.exports = { findContractDeliverable, syncTaskProgressToContract };
