const Client = require("../models/Client");
const Contract = require("../models/Contract");
const Task = require("../models/Task");
const { computeDeliverableStats } = require("../utils/deliverableStats");
const { SERVICE_CATEGORY_LABELS } = require("../utils/pricingHelpers");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RENEWAL_SOON_DAYS = 30;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function serviceNames(contract) {
  return (contract.selectedServices || [])
    .filter((cat) => cat?.enabled && (cat.selections || []).length)
    .map((cat) => SERVICE_CATEGORY_LABELS[cat.categoryId] || cat.categoryId)
    .join(", ") || "—";
}

function clientInfo(contract) {
  return {
    contractId: contract._id,
    clientId: contract.clientId?._id || contract.clientId,
    clientName: contract.clientId?.clientName || "—",
    companyName: contract.clientId?.companyName || "",
    projectName: contract.projectName,
    contractNumber: contract.contractNumber,
  };
}

/**
 * GET /clients/sales-dashboard (role: sales)
 *
 * Everything a sales person needs about THEIR OWN cases only — clients whose
 * `salesPerson` is the logged-in user: pending renewals, outstanding balances,
 * and deliverable progress (with who on the team is working on each service).
 *
 * Definitions mirror the admin dashboard (getDashboardStats) so both panels
 * agree on the numbers: balance = contract amount − real payments ledger, and
 * a renewal is pending until the contract is marked renewed ("Completed").
 * Unlike the admin view, nothing is limited to a date range — a sales person
 * sees every open item on their book.
 */
exports.getSalesDashboard = async (req, res) => {
  try {
    const salesPersonId = req.user.id;
    const now = new Date();
    const today = startOfDay(now);

    const clients = await Client.find({ salesPerson: salesPersonId }).select("_id status").lean();
    const clientIds = clients.map((c) => c._id);

    const contracts = await Contract.find({ clientId: { $in: clientIds } })
      .populate("clientId", "clientName companyName")
      .sort({ createdAt: -1 });

    // Rejected contracts are never owed, renewed, or delivered.
    const liveContracts = contracts.filter((c) => c.contractStatus !== "rejected");

    // ── Renewals ──────────────────────────────────────────────────────────
    const renewals = liveContracts
      .filter((c) => c.validUntil && c.renewalStatus !== "Completed")
      .map((c) => {
        const renewalDay = startOfDay(new Date(c.validUntil));
        const daysLeft = Math.round((renewalDay - today) / ONE_DAY_MS);
        let status = "Upcoming";
        if (daysLeft < 0) status = "Overdue";
        else if (daysLeft <= RENEWAL_SOON_DAYS) status = "Due Soon";
        return {
          ...clientInfo(c),
          serviceName: serviceNames(c),
          renewalDate: c.validUntil,
          renewalAmount: c.projectAmount || 0,
          daysLeft,
          status,
        };
      })
      .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));

    // ── Balance Due ───────────────────────────────────────────────────────
    const balanceDue = liveContracts
      .map((c) => {
        const received = (c.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = Math.max(round2((c.projectAmount || 0) - received), 0);
        return { c, received, balance };
      })
      .filter(({ balance }) => balance > 0)
      .map(({ c, received, balance }) => {
        let status = "No Due Date";
        if (c.nextDueDate) {
          const dueDay = startOfDay(new Date(c.nextDueDate));
          if (dueDay.getTime() === today.getTime()) status = "Due Today";
          else status = dueDay < today ? "Overdue" : "Upcoming";
        }
        return {
          ...clientInfo(c),
          contractAmount: c.projectAmount || 0,
          receivedAmount: round2(received),
          balance,
          dueDate: c.nextDueDate || null,
          status,
        };
      })
      .sort((a, b) => {
        const rank = { Overdue: 0, "Due Today": 1, Upcoming: 2, "No Due Date": 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15);
      });

    // ── Deliverables ──────────────────────────────────────────────────────
    // Only contracts still in force: not expired, and not superseded by a
    // renewal (the renewal contract carries the deliverables from there).
    const deliveryContracts = liveContracts.filter(
      (c) => c.contractStatus !== "expired" && c.renewalStatus !== "Completed" && (c.deliverables || []).length
    );

    const tasks = await Task.find({ contractId: { $in: deliveryContracts.map((c) => c._id) } })
      .select("contractId assignedTo deliverables.categoryId status")
      .populate("assignedTo", "name")
      .lean();
    // contractId -> categoryId -> assignee name (or null when unassigned)
    const assigneeByContract = new Map();
    tasks.forEach((t) => {
      const key = String(t.contractId);
      if (!assigneeByContract.has(key)) assigneeByContract.set(key, new Map());
      const byCategory = assigneeByContract.get(key);
      (t.deliverables || []).forEach((d) => {
        const cat = d.categoryId || "general";
        if (!byCategory.get(cat)) byCategory.set(cat, t.assignedTo?.name || null);
      });
    });

    const deliverables = deliveryContracts.map((c) => {
      const sinceDate = c.sentAt || c.createdAt || now;
      const byCategory = assigneeByContract.get(String(c._id)) || new Map();
      const items = c.deliverables.map((d) => {
        const stats = computeDeliverableStats(d, sinceDate);
        const categoryId = d.categoryId || "general";
        return {
          _id: d._id,
          title: d.title,
          categoryId,
          categoryLabel: SERVICE_CATEGORY_LABELS[d.categoryId] || (d.categoryId ? d.categoryId : "General"),
          trackingMode: d.trackingMode || "quantity",
          quantity: d.quantity,
          frequency: stats.frequency,
          delivered: stats.delivered,
          due: stats.due,
          pending: stats.pending,
          status: stats.status,
          assignee: byCategory.get(categoryId) ?? null,
        };
      });
      const counts = { Completed: 0, "In Progress": 0, Pending: 0 };
      items.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });
      return {
        ...clientInfo(c),
        contractStatus: c.contractStatus,
        validUntil: c.validUntil || null,
        total: items.length,
        completed: counts.Completed,
        inProgress: counts["In Progress"],
        pending: counts.Pending,
        items,
      };
    });

    // ── Summary ───────────────────────────────────────────────────────────
    const activeContracts = liveContracts.filter(
      (c) => c.contractStatus !== "expired" && c.renewalStatus !== "Completed" &&
        (!c.validUntil || startOfDay(new Date(c.validUntil)) >= today)
    ).length;
    const renewalsSoon = renewals.filter((r) => r.status !== "Upcoming");
    const deliverableItems = deliverables.flatMap((d) => d.items);

    return res.json({
      summary: {
        totalClients: clients.length,
        convertedClients: clients.filter((c) => c.status === "converted").length,
        activeContracts,
        totalBalanceDue: round2(balanceDue.reduce((s, b) => s + b.balance, 0)),
        overdueBalanceCount: balanceDue.filter((b) => b.status === "Overdue").length,
        renewalsSoonCount: renewalsSoon.length,
        renewalsSoonAmount: round2(renewalsSoon.reduce((s, r) => s + r.renewalAmount, 0)),
        overdueRenewalCount: renewals.filter((r) => r.status === "Overdue").length,
        totalDeliverables: deliverableItems.length,
        completedDeliverables: deliverableItems.filter((i) => i.status === "Completed").length,
        renewalSoonDays: RENEWAL_SOON_DAYS,
      },
      renewals,
      balanceDue,
      deliverables,
    });
  } catch (error) {
    console.error("Error building sales dashboard:", error);
    return res.status(500).json({ message: error.message || "Failed to load sales dashboard" });
  }
};
