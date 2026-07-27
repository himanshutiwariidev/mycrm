const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS = { week: 7 * ONE_DAY_MS, month: 30 * ONE_DAY_MS };

function computeDeliverableStats(deliverable, sinceDate) {
  const quantity = deliverable.quantity || 0;
  const delivered = deliverable.delivered || 0;
  const frequency = deliverable.frequency || "one-time";

  // Status-mode deliverables (one-off builds, campaigns, productions — no
  // natural repeating quantity) are tracked by an explicit status the admin
  // sets directly, not derived from delivered-vs-quantity math.
  if (deliverable.trackingMode === "status") {
    return { frequency, periodsElapsed: 1, due: quantity, delivered, pending: 0, status: deliverable.status || "Pending" };
  }

  if (frequency === "week" || frequency === "month") {
    const elapsedMs = Math.max(0, Date.now() - new Date(sinceDate).getTime());
    const periodsElapsed = Math.floor(elapsedMs / PERIOD_MS[frequency]) + 1;
    const due = quantity * periodsElapsed;
    const pending = Math.max(0, due - delivered);
    const status = delivered >= due ? "Completed" : delivered > 0 ? "In Progress" : "Pending";
    return { frequency, periodsElapsed, due, delivered, pending, status };
  }

  const due = quantity;
  const pending = Math.max(0, due - delivered);
  const status = delivered <= 0 ? "Pending" : delivered < quantity ? "In Progress" : "Completed";
  return { frequency, periodsElapsed: 1, due, delivered, pending, status };
}

function decorateContract(contractDoc) {
  const contract = contractDoc.toObject ? contractDoc.toObject() : contractDoc;
  const sinceDate = contract.sentAt || contract.createdAt || new Date();

  contract.deliverables = (contract.deliverables || []).map((deliverable) => ({
    ...deliverable,
    ...computeDeliverableStats(deliverable, sinceDate),
  }));

  return contract;
}

module.exports = { computeDeliverableStats, decorateContract };
