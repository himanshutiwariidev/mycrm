const Client = require("../models/Client");
const Contract = require("../models/Contract");
const Task = require("../models/Task");
const User = require("../models/User");
const Meeting = require("../models/Meeting");
const ClientVisit = require("../models/ClientVisit");
const mongoose = require("mongoose");
const { hiddenClientIds } = require("../middleware/clientOwnership");
const { computeDeliverableStats } = require("../utils/deliverableStats");
const { SERVICE_CATEGORY_LABELS } = require("../utils/pricingHelpers");
const { collectedOf, writtenOffOf } = require("../utils/paymentTaxes");

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

/**
 * Whose book a dashboard covers. A sales person: their own. A sales manager
 * (or admin): ?salesPerson=<id> for one person, otherwise the whole sales team.
 * Returns the Client filter, or { error }.
 */
async function salesScope(req) {
  if (req.user.role === "sales") return { filter: { salesPerson: req.user.id } };
  const requested = req.query.salesPerson;
  if (requested) {
    if (!mongoose.isValidObjectId(requested) || !(await User.exists({ _id: requested, role: "sales" }))) {
      return { error: "Sales person not found" };
    }
    return { filter: { salesPerson: requested } };
  }
  const team = await User.distinct("_id", { role: "sales" });
  return { filter: { salesPerson: { $in: team } }, team: true };
}

function clientInfo(contract) {
  return {
    contractId: contract._id,
    clientId: contract.clientId?._id || contract.clientId,
    clientName: contract.clientId?.clientName || "—",
    companyName: contract.clientId?.companyName || "",
    projectName: contract.projectName,
    contractNumber: contract.contractNumber,
    // Filled on the whole-team view, so a manager can see whose case it is.
    salesPersonName: contract.clientId?.salesPerson?.name || undefined,
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
    const scope = await salesScope(req);
    if (scope.error) return res.status(404).json({ message: scope.error });
    const now = new Date();
    const today = startOfDay(now);

    const clients = await Client.find(scope.filter).select("_id status").lean();
    const clientIds = clients.map((c) => c._id);

    const contracts = await Contract.find({ clientId: { $in: clientIds } })
      .populate({ path: "clientId", select: "clientName companyName salesPerson", ...(scope.team ? { populate: { path: "salesPerson", select: "name" } } : {}) })
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
        // Balance off what each payment counts; received = money actually collected.
        const counted = (c.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const received = (c.payments || []).reduce((sum, p) => sum + collectedOf(p), 0);
        const balance = Math.max(round2((c.projectAmount || 0) - counted - writtenOffOf(c)), 0);
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

/** This month by default; ?from=&to= (dates) for another period. */
function periodOf(query) {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

/**
 * GET /clients/sales-team?from&to (sales manager / admin)
 *
 * One row per sales person: their book (clients, outstanding, overdue), what
 * they booked and collected in the period, their client meetings and visits —
 * plus how many telecaller meetings are still waiting to be assigned.
 * Balances follow the sales dashboard: contract amount − what each payment
 * counts; "collected" is money actually received (collectedOf).
 */
exports.getSalesTeam = async (req, res) => {
  try {
    const period = periodOf(req.query);
    if (!period) return res.status(400).json({ message: "Invalid period" });
    const { from, to } = period;
    const today = startOfDay(new Date());

    const salesUsers = await User.find({ role: "sales" }).select("name email isActive").sort({ name: 1 }).lean();
    const ids = salesUsers.map((u) => u._id);

    const [clients, meetingRows, visitRows, unassignedMeetings] = await Promise.all([
      Client.find({ salesPerson: { $in: ids } }).select("_id salesPerson status").lean(),
      Meeting.aggregate([
        { $match: { kind: "client", salesPerson: { $in: ids } } },
        {
          $group: {
            _id: "$salesPerson",
            upcoming: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "scheduled"] }, { $gte: ["$meetingDate", today] }] }, 1, 0] } },
            pendingUpdate: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "scheduled"] }, { $lt: ["$meetingDate", today] }] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $gte: ["$meetingDate", from] }, { $lte: ["$meetingDate", to] }] }, 1, 0] } },
            converted: { $sum: { $cond: [{ $and: [{ $eq: ["$outcome", "converted"] }, { $gte: ["$meetingDate", from] }, { $lte: ["$meetingDate", to] }] }, 1, 0] } },
          },
        },
      ]),
      ClientVisit.aggregate([
        { $match: { salesPerson: { $in: ids }, "checkIn.at": { $gte: from, $lte: to } } },
        { $group: { _id: "$salesPerson", n: { $sum: 1 } } },
      ]),
      hiddenClientIds(req.user).then((hidden) => Meeting.countDocuments({ kind: "client", salesPerson: null, status: "scheduled", clientId: { $nin: hidden } })),
    ]);

    const ownerOf = new Map(clients.map((c) => [String(c._id), String(c.salesPerson)]));
    const contracts = await Contract.find({ clientId: { $in: clients.map((c) => c._id) }, contractStatus: { $ne: "rejected" } })
      .select("clientId projectAmount payments badDebt nextDueDate createdAt").lean();

    const rows = new Map(salesUsers.map((u) => [String(u._id), {
      salesPerson: { _id: u._id, name: u.name, email: u.email, isActive: u.isActive !== false },
      clients: 0, convertedClients: 0, contracts: 0, booked: 0, collected: 0, outstanding: 0, overdue: 0,
      meetingsUpcoming: 0, meetingsPendingUpdate: 0, meetingsCompleted: 0, meetingsConverted: 0, visits: 0,
    }]));
    clients.forEach((c) => {
      const row = rows.get(String(c.salesPerson));
      if (!row) return;
      row.clients += 1;
      if (c.status === "converted") row.convertedClients += 1;
    });
    contracts.forEach((c) => {
      const row = rows.get(ownerOf.get(String(c.clientId)));
      if (!row) return;
      row.contracts += 1;
      if (c.createdAt >= from && c.createdAt <= to) row.booked += c.projectAmount || 0;
      const counted = (c.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      (c.payments || []).forEach((p) => {
        const paidOn = p.paymentDate && new Date(p.paymentDate);
        if (paidOn && paidOn >= from && paidOn <= to) row.collected += collectedOf(p);
      });
      const balance = Math.max(round2((c.projectAmount || 0) - counted - writtenOffOf(c)), 0);
      row.outstanding += balance;
      if (balance > 0 && c.nextDueDate && startOfDay(new Date(c.nextDueDate)) < today) row.overdue += 1;
    });
    meetingRows.forEach((m) => {
      const row = rows.get(String(m._id));
      if (!row) return;
      row.meetingsUpcoming = m.upcoming;
      row.meetingsPendingUpdate = m.pendingUpdate;
      row.meetingsCompleted = m.completed;
      row.meetingsConverted = m.converted;
    });
    visitRows.forEach((v) => { const row = rows.get(String(v._id)); if (row) row.visits = v.n; });

    const team = [...rows.values()].map((r) => ({ ...r, booked: round2(r.booked), collected: round2(r.collected), outstanding: round2(r.outstanding) }));
    const sum = (k) => round2(team.reduce((s, r) => s + r[k], 0));
    return res.json({
      period: { from, to },
      summary: {
        salesPeople: team.filter((r) => r.salesPerson.isActive).length,
        clients: sum("clients"),
        booked: sum("booked"),
        collected: sum("collected"),
        outstanding: sum("outstanding"),
        overdue: sum("overdue"),
        meetingsUpcoming: sum("meetingsUpcoming"),
        meetingsCompleted: sum("meetingsCompleted"),
        meetingsConverted: sum("meetingsConverted"),
        visits: sum("visits"),
        unassignedMeetings,
      },
      team,
    });
  } catch (error) {
    console.error("Error building sales team view:", error);
    return res.status(500).json({ message: error.message || "Failed to load the sales team" });
  }
};
