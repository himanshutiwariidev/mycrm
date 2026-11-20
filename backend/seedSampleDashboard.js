// Seeds heavy-amount demo data so every Super Admin Dashboard card and chart
// has something to show (and long ₹ crore figures can be checked for overflow):
// revenue this month (renewal vs new, bank vs cash, spread across days), last
// month's revenue/expenses for the "% from last month" figures, pending
// renewals, balances due (overdue / due today / upcoming), expenses, and a
// recent activity feed.
//
//   npm run seed:sample-dashboard              add (or reset) the demo data
//   npm run seed:sample-dashboard -- --remove  delete everything this script made
//
// Everything is tagged — contract numbers "DEMO-DASH-*", client emails
// "@dash-demo.example.com", expense titles "[Demo] …" — so re-running replaces
// the previous demo set and --remove never touches real records.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Client = require("./models/Client");
const Contract = require("./models/Contract");
const Expense = require("./models/Expense");
const ActivityLog = require("./models/ActivityLog");
const ClientVisit = require("./models/ClientVisit");
const Meeting = require("./models/Meeting");
const { SERVICE_CATEGORY_LABELS } = require("./utils/pricingHelpers");

// Local-only guard, same as seedAdmin.js: never write demo data to a remote DB.
const isLocalDb = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "");
if (!isLocalDb || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: sample dashboard data runs only against a localhost MongoDB.");
  process.exit(1);
}

const CONTRACT_PREFIX = "DEMO-DASH-";
const EMAIL_DOMAIN = "dash-demo.example.com";
const EXPENSE_TAG = "[Demo] ";
// Shared with seedSampleVisits.js, so the sales dashboard shows these too.
const DEMO_SALES = { name: "Rohit Verma (Demo)", email: "sales.demo@example.com", password: "sales123" };

const L = 100000; // 1 lakh
const CR = 100 * L; // 1 crore

const now = new Date();
/** Date in the current month (day clamped to today), at a business hour. */
const thisMonth = (day, hh = 11) => new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), hh, 0, 0);
/** A day in the current month, NOT clamped — for upcoming due/renewal dates. */
const dueThisMonth = (day) => new Date(now.getFullYear(), now.getMonth(), day, 11, 0, 0);
/** Date `monthsBack` months ago on `day`. */
const monthsAgo = (monthsBack, day, hh = 11) => new Date(now.getFullYear(), now.getMonth() - monthsBack, day, hh, 0, 0);
const hoursAgo = (h) => new Date(now.getTime() - h * 3600e3);

const CLIENTS = [
  { key: "sunrise", clientName: "Arvind Mehta", companyName: "Sunrise Retail Pvt Ltd (Demo)", city: "Mumbai", state: "Maharashtra", createdAt: monthsAgo(14, 3) },
  { key: "apex", clientName: "Kavya Iyer", companyName: "Apex Digital Services (Demo)", city: "Pune", state: "Maharashtra", createdAt: monthsAgo(13, 9) },
  { key: "western", clientName: "Harshad Patel", companyName: "Western Logistics Hub (Demo)", city: "Ahmedabad", state: "Gujarat", createdAt: monthsAgo(1, 18) },
  { key: "shakti", clientName: "Manpreet Singh", companyName: "Shakti Auto Mart (Demo)", city: "Ludhiana", state: "Punjab", createdAt: monthsAgo(12, 20) },
  { key: "brightpath", clientName: "Deepa Nair", companyName: "Brightpath Learning Labs (Demo)", city: "Bengaluru", state: "Karnataka", createdAt: monthsAgo(12, 2) },
  { key: "agro", clientName: "Ramesh Yadav", companyName: "Bharat Agro Exports (Demo)", city: "Indore", state: "Madhya Pradesh", createdAt: monthsAgo(14, 25) },
  { key: "jewellers", clientName: "Sunita Sharma", companyName: "Sharma Jewellers (Demo)", city: "Jaipur", state: "Rajasthan", createdAt: thisMonth(16, 10) },
  { key: "kapoor", clientName: "Vikram Kapoor", companyName: "Kapoor Hospitality Group (Demo)", city: "New Delhi", state: "Delhi", createdAt: monthsAgo(13, 1) },
  { key: "greenleaf", clientName: "Ananya Rao", companyName: "Greenleaf Organics (Demo)", city: "Hyderabad", state: "Telangana", createdAt: monthsAgo(13, 20) },
  { key: "nova", clientName: "Rahul Bansal", companyName: "Nova Fintech Solutions (Demo)", city: "Gurugram", state: "Haryana", createdAt: thisMonth(12, 10) },
];

/** Splits an amount across services so "Service Wise Cases" has per-service prices. */
function services(amount, split) {
  return Object.entries(split).map(([categoryId, share]) => ({
    categoryId,
    enabled: true,
    selections: [{ path: `${categoryId}.package`, label: `${categoryId} package`, values: {}, advanced: { sellingPrice: Math.round(amount * share), discount: 0, gst: 0 } }],
  }));
}

const pay = (amount, method, paymentDate) => ({ amount, method, paymentDate, notes: "Demo payment" });

// key → contract spec. `renewedFrom` points at another key in this list.
const CONTRACTS = [
  // ── Previous terms that were already renewed (renewalStatus Completed) ──
  { key: "sunrise-old", client: "sunrise", name: "Omnichannel Marketing 2025", amount: 2.4 * CR, start: monthsAgo(13, 1), validUntil: monthsAgo(1, 31), renewalStatus: "Completed",
    payments: [pay(1.2 * CR, "RTGS", monthsAgo(12, 5)), pay(1.2 * CR, "RTGS", monthsAgo(1, 8))], split: { socialMedia: 0.5, sponsoredAds: 0.5 }, createdAt: monthsAgo(13, 1) },
  { key: "apex-old", client: "apex", name: "Digital Growth Retainer 2025", amount: 1.8 * CR, start: monthsAgo(12, 10), validUntil: monthsAgo(1, 9), renewalStatus: "Completed",
    payments: [pay(90 * L, "NEFT", monthsAgo(12, 12)), pay(90 * L, "NEFT", monthsAgo(1, 18))], split: { webDevelopment: 0.6, rankingOptimization: 0.4 }, createdAt: monthsAgo(12, 10) },
  { key: "kapoor-old", client: "kapoor", name: "Hotel Branding 2025", amount: 75 * L, start: monthsAgo(12, 1), validUntil: monthsAgo(0, 1), renewalStatus: "Completed",
    payments: [pay(50 * L, "Cheque", monthsAgo(11, 4)), pay(25 * L, "Cheque", monthsAgo(1, 5))], split: { socialMedia: 1 }, createdAt: monthsAgo(12, 1) },

  // ── Renewal contracts (created via "Renew Contract") — renewal revenue ──
  { key: "sunrise-renewal", client: "sunrise", name: "Omnichannel Marketing 2026", amount: 3.2 * CR, renewedFrom: "sunrise-old", status: "accepted",
    start: thisMonth(1), validUntil: monthsAgo(-12, 1), nextDueDate: dueThisMonth(28),
    payments: [pay(1.5 * CR, "NEFT", thisMonth(3)), pay(80 * L, "RTGS", thisMonth(12))], split: { socialMedia: 0.45, sponsoredAds: 0.35, influencerMarketing: 0.2 }, createdAt: thisMonth(2) },
  { key: "apex-renewal", client: "apex", name: "Digital Growth Retainer 2026", amount: 2.1 * CR, renewedFrom: "apex-old", status: "accepted",
    start: monthsAgo(1, 10), validUntil: monthsAgo(-11, 9), nextDueDate: thisMonth(10),
    payments: [pay(1.2 * CR, "RTGS", thisMonth(6)), pay(45 * L, "Cash", thisMonth(15))], split: { webDevelopment: 0.55, rankingOptimization: 0.45 }, createdAt: thisMonth(5) },
  { key: "kapoor-renewal", client: "kapoor", name: "Hotel Branding 2026", amount: 95 * L, renewedFrom: "kapoor-old", status: "sent",
    start: thisMonth(2), validUntil: monthsAgo(-12, 1),
    payments: [pay(60 * L, "Cheque", thisMonth(9)), pay(35 * L, "Cash", thisMonth(17))], split: { socialMedia: 0.6, filmProduction: 0.4 }, createdAt: thisMonth(8) },

  // ── New cases — new-client revenue ──
  { key: "western-new", client: "western", name: "Fleet Tracking App + Website", amount: 4.5 * CR, status: "accepted",
    start: monthsAgo(1, 20), validUntil: monthsAgo(-11, 20), nextDueDate: dueThisMonth(25),
    payments: [pay(1 * CR, "NEFT", monthsAgo(1, 22)), pay(2.25 * CR, "RTGS", thisMonth(5)), pay(50 * L, "Cash", thisMonth(14))], split: { mobileAppDevelopment: 0.6, webDevelopment: 0.4 }, createdAt: monthsAgo(1, 20) },
  { key: "shakti-new", client: "shakti", name: "Dealer Lead-Gen Campaign", amount: 1.25 * CR, status: "sent",
    start: thisMonth(4), validUntil: monthsAgo(-6, 4), nextDueDate: thisMonth(15),
    payments: [pay(40 * L, "Cash", thisMonth(4)), pay(30 * L, "Cheque", thisMonth(18))], split: { sponsoredAds: 0.7, googleMyBusiness: 0.3 }, createdAt: thisMonth(4) },
  { key: "brightpath-new", client: "brightpath", name: "Course Launch Video Series", amount: 68 * L, status: "accepted",
    start: thisMonth(8), validUntil: monthsAgo(-3, 8),
    payments: [pay(68 * L, "NEFT", thisMonth(8))], split: { filmProduction: 0.7, socialMedia: 0.3 }, createdAt: thisMonth(8) },
  { key: "agro-new", client: "agro", name: "Export Portal + SEO", amount: 2.75 * CR, status: "accepted",
    start: monthsAgo(2, 10), validUntil: monthsAgo(-10, 10), nextDueDate: thisMonth(now.getDate()),
    payments: [pay(1 * CR, "RTGS", monthsAgo(2, 12)), pay(75 * L, "NEFT", monthsAgo(1, 15)), pay(60 * L, "Cash", thisMonth(11))], split: { webDevelopment: 0.5, rankingOptimization: 0.5 }, createdAt: monthsAgo(2, 10) },
  { key: "jewellers-new", client: "jewellers", name: "Festive Season Campaign", amount: 38.5 * L, status: "sent",
    start: thisMonth(16), validUntil: monthsAgo(-2, 16), nextDueDate: monthsAgo(-1, 5),
    payments: [pay(20 * L, "Cash", thisMonth(16))], split: { socialMedia: 0.5, influencerMarketing: 0.5 }, createdAt: thisMonth(16) },

  { key: "nova-new", client: "nova", name: "Fintech App MVP", amount: 1.6 * CR, status: "accepted",
    start: thisMonth(12), validUntil: monthsAgo(-12, 12), nextDueDate: monthsAgo(-1, 12),
    payments: [pay(50 * L, "RTGS", thisMonth(12))], split: { mobileAppDevelopment: 0.8, aiServices: 0.2 }, createdAt: thisMonth(12) },

  // ── Older terms still awaiting renewal (renewal due / overdue) — fully paid ──
  { key: "brightpath-old", client: "brightpath", name: "LMS Maintenance 2025", amount: 55 * L, start: monthsAgo(12, 22), validUntil: dueThisMonth(22), renewalStatus: "Upcoming",
    payments: [pay(55 * L, "NEFT", monthsAgo(12, 24))], split: { webDevelopment: 1 }, createdAt: monthsAgo(12, 22) },
  { key: "agro-old", client: "agro", name: "Trade Fair Promotions 2025", amount: 1.1 * CR, start: monthsAgo(12, 30), validUntil: dueThisMonth(30), renewalStatus: "Upcoming",
    payments: [pay(1.1 * CR, "RTGS", monthsAgo(12, 30))], split: { eventManagement: 0.6, sponsoredAds: 0.4 }, createdAt: monthsAgo(12, 28) },
  { key: "shakti-old", client: "shakti", name: "Showroom Social Media 2025", amount: 72 * L, start: monthsAgo(12, 28), validUntil: monthsAgo(1, 28), renewalStatus: "Upcoming",
    payments: [pay(72 * L, "Cheque", monthsAgo(12, 28))], split: { socialMedia: 1 }, createdAt: monthsAgo(12, 26) },
  { key: "greenleaf-old", client: "greenleaf", name: "Organic Store SEO 2025", amount: 28 * L, start: monthsAgo(12, 26), validUntil: dueThisMonth(26), renewalStatus: "Upcoming",
    payments: [pay(28 * L, "UPI", monthsAgo(12, 27))], split: { rankingOptimization: 1 }, createdAt: monthsAgo(12, 26) },
];

// Monthly history so the stat-card trend lines (one point per month) show a
// realistic up-and-down climb instead of ₹0 before September:
// [monthsBack, extra revenue that month, expenses that month]. Combined with
// the contracts above, monthly revenue runs ≈ 3.2 → 5.1 → 4.3 → 6.8 → 6.0 →
// 10.3 Cr (Jun → Nov). Each month's revenue is a one-off campaign contract,
// fully paid inside that month and already closed (expired + renewal
// Completed), so it never shows up in renewals or balance due.
const HISTORY = [
  [5, 3.2 * CR, 52 * L],
  [4, 5.1 * CR, 61 * L],
  [3, 4.3 * CR, 57 * L],
  [2, 5.8 * CR, 66 * L], // + Bharat Agro's ₹1 Cr in this month → 6.8 Cr
  [1, 1.9 * CR, 0], // + October payments above (₹4.1 Cr) → 6.0 Cr; October expenses listed below
];
const HISTORY_CLIENTS = ["sunrise", "apex", "western", "kapoor", "agro"];
const HISTORY_SERVICES = [
  { socialMedia: 0.6, sponsoredAds: 0.4 },
  { webDevelopment: 1 },
  { sponsoredAds: 0.7, googleMyBusiness: 0.3 },
  { eventManagement: 0.5, socialMedia: 0.5 },
  { rankingOptimization: 1 },
];
HISTORY.forEach(([back, revenue], i) => {
  const monthName = monthsAgo(back, 1).toLocaleDateString("en-US", { month: "long" });
  CONTRACTS.push({
    key: `history-${back}`,
    client: HISTORY_CLIENTS[i],
    name: `${monthName} Campaign`,
    amount: revenue,
    status: "expired",
    renewalStatus: "Completed",
    start: monthsAgo(back, 3),
    validUntil: monthsAgo(back, 28),
    payments: [
      pay(Math.round(revenue * 0.55), "RTGS", monthsAgo(back, 6)),
      pay(Math.round(revenue * 0.2), "Cash", monthsAgo(back, 14)),
      pay(revenue - Math.round(revenue * 0.55) - Math.round(revenue * 0.2), "NEFT", monthsAgo(back, 22)),
    ],
    split: HISTORY_SERVICES[i],
    createdAt: monthsAgo(back, 3),
  });
});

const EXPENSES = [
  // this month
  ["Salaries – November", "Salary", 48 * L, "NEFT", thisMonth(1)],
  ["Office rent – HQ", "Rent", 6.5 * L, "NEFT", thisMonth(2)],
  ["Meta & Google ad credits", "Marketing", 22 * L, "Card Swap", thisMonth(7)],
  ["Design & CRM software", "Software & Tools", 3.4 * L, "UPI", thisMonth(9)],
  ["Client visits – travel", "Travel", 1.85 * L, "Cash", thisMonth(13)],
  ["CA & legal retainer", "Professional Fees", 9 * L, "NEFT", thisMonth(16)],
  ["Electricity & internet", "Utilities", 1.2 * L, "UPI", thisMonth(18)],
  // last month
  ["Salaries – October", "Salary", 46 * L, "NEFT", monthsAgo(1, 3)],
  ["Office rent – HQ", "Rent", 6.5 * L, "NEFT", monthsAgo(1, 3)],
  ["Meta & Google ad credits", "Marketing", 15 * L, "Card Swap", monthsAgo(1, 8)],
  ["Diwali gifts & office supplies", "Office Supplies", 4 * L, "Cash", monthsAgo(1, 20)],
  // earlier months (salary ≈ 75%, rent, marketing for the rest)
  ...HISTORY.filter(([, , spend]) => spend > 0).flatMap(([back, , spend]) => {
    const month = monthsAgo(back, 1).toLocaleDateString("en-US", { month: "long" });
    const salary = Math.round(spend * 0.75);
    const rent = 6.5 * L;
    return [
      [`Salaries – ${month}`, "Salary", salary, "NEFT", monthsAgo(back, 3)],
      ["Office rent – HQ", "Rent", rent, "NEFT", monthsAgo(back, 3)],
      ["Meta & Google ad credits", "Marketing", spend - salary - rent, "Card Swap", monthsAgo(back, 10)],
    ];
  }),
];

// Deliverables per service for the live demo contracts, so the sales
// Dashboard's Deliverables card and each client's Deliverables tab show
// realistic progress. [item, quantity, frequency, trackingMode]
const DELIVERABLE_TEMPLATES = {
  socialMedia: [["Instagram Content Package: AI Reels", 8, "month"], ["Instagram Content Package: Graphic Creatives", 12, "month"], ["Facebook Content Package: Graphic Creatives", 12, "month"]],
  sponsoredAds: [["Meta & Google Ads Campaigns", 3, "month"]],
  influencerMarketing: [["Influencer Collaborations", 4, "month"]],
  webDevelopment: [["Custom Website Build", 1, "one-time", "status"]],
  rankingOptimization: [["SEO Keywords Ranked", 25, "month"]],
  mobileAppDevelopment: [["Mobile App Build", 1, "one-time", "status"]],
  googleMyBusiness: [["Google Business Profile Posts", 8, "month"]],
  filmProduction: [["Brand Film + Reels Cut", 1, "one-time", "status"]],
  aiServices: [["AI Chatbot Setup", 1, "one-time", "status"]],
};
const PROGRESS = [0.25, 0.5, 0.75, 1, 0.6, 0.4];
const STATUS_CYCLE = ["In Progress", "Completed", "Pending", "In Progress"];

function demoDeliverables(spec) {
  const live = spec.status !== "expired" && spec.renewalStatus !== "Completed";
  if (!live) return [];
  // Months this contract has been running → how much is due so far.
  const periods = Math.max(1, (now.getFullYear() - spec.createdAt.getFullYear()) * 12 + now.getMonth() - spec.createdAt.getMonth() + 1);
  let n = 0;
  return Object.keys(spec.split).flatMap((categoryId) => (DELIVERABLE_TEMPLATES[categoryId] || []).map(([item, quantity, frequency, trackingMode = "quantity"]) => {
    n += 1;
    const label = SERVICE_CATEGORY_LABELS[categoryId] || categoryId;
    const due = frequency === "month" ? quantity * periods : quantity;
    return {
      title: `${label} — ${item}`,
      quantity,
      frequency,
      categoryId,
      path: `${categoryId}.package`,
      trackingMode,
      delivered: trackingMode === "status" ? 0 : Math.round(due * PROGRESS[(spec.amount / L + n) % PROGRESS.length | 0]),
      status: trackingMode === "status" ? STATUS_CYCLE[n % STATUS_CYCLE.length] : "Pending",
    };
  }));
}

async function saveAt(doc, at) {
  doc.createdAt = at;
  if (doc.schema.path("updatedAt")) doc.updatedAt = at;
  await doc.save({ timestamps: false });
  return doc;
}

async function removeDemoData() {
  const clientIds = await Client.distinct("_id", { email: new RegExp(`@${EMAIL_DOMAIN.replace(/\./g, "\\.")}$`) });
  const [contracts, expenses, activity, clients] = await Promise.all([
    Contract.deleteMany({ contractNumber: new RegExp(`^${CONTRACT_PREFIX}`) }),
    Expense.deleteMany({ title: new RegExp(`^${EXPENSE_TAG.replace(/[[\]]/g, "\\$&")}`) }),
    ActivityLog.deleteMany({ clientId: { $in: clientIds } }),
    Client.deleteMany({ _id: { $in: clientIds } }),
  ]);
  return { contracts: contracts.deletedCount, expenses: expenses.deletedCount, activity: activity.deletedCount, clients: clients.deletedCount };
}

/** Reuses the demo sales user from seedSampleVisits.js, creating it if needed. */
async function demoSalesUser() {
  const existing = await User.findOne({ email: DEMO_SALES.email });
  if (existing) return existing;
  return User.create({ name: DEMO_SALES.name, email: DEMO_SALES.email, password: await bcrypt.hash(DEMO_SALES.password, 12), role: "sales", isActive: true });
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const removed = await removeDemoData();

    if (process.argv.includes("--remove")) {
      // Drop the shared demo sales user only once nothing demo uses it any more.
      const sales = await User.findOne({ email: DEMO_SALES.email }).select("_id").lean();
      if (sales && !(await Client.exists({ salesPerson: sales._id })) && !(await ClientVisit.exists({ salesPerson: sales._id })) && !(await Meeting.exists({ salesPerson: sales._id }))) {
        await User.deleteOne({ _id: sales._id });
        removed.salesUser = 1;
      }
      console.log("Removed demo dashboard data:", removed);
      return;
    }

    const admin = (await User.findOne({ role: "admin" }).select("_id").lean()) || (await User.findOne().select("_id").lean());
    if (!admin) throw new Error("No user found to own the demo expenses — create an admin first (npm run seed:admin).");
    const sales = await demoSalesUser();

    // Clients
    const clients = {};
    for (const [i, c] of CLIENTS.entries()) {
      clients[c.key] = await saveAt(
        new Client({
          clientName: c.clientName,
          companyName: c.companyName,
          email: `${c.key}@${EMAIL_DOMAIN}`,
          phone: `90000100${String(i + 1).padStart(2, "0")}`,
          city: c.city,
          state: c.state,
          country: "India",
          projectType: "service",
          leadSource: ["cold call", "visit", "client reference", "telecaller"][i % 4],
          status: "converted",
          salesPerson: sales._id,
        }),
        c.createdAt
      );
    }

    // Contracts (old terms first, so renewals can point at them)
    const contracts = {};
    for (const [i, spec] of CONTRACTS.entries()) {
      const contract = new Contract({
        contractNumber: `${CONTRACT_PREFIX}${String(i + 1).padStart(3, "0")}`,
        clientId: clients[spec.client]._id,
        projectName: spec.name,
        projectDescription: `${spec.name} — demo contract for dashboard testing`,
        projectAmount: spec.amount,
        preTaxAmount: spec.amount,
        currency: "INR",
        paymentMethod: spec.payments[0]?.method || "NEFT",
        contractStatus: spec.status || "accepted",
        contractStartDate: spec.start,
        validUntil: spec.validUntil,
        nextDueDate: spec.nextDueDate,
        renewalStatus: spec.renewalStatus || "Upcoming",
        renewedFromContractId: spec.renewedFrom ? contracts[spec.renewedFrom]._id : undefined,
        payments: spec.payments,
        selectedServices: services(spec.amount, spec.split),
        deliverables: demoDeliverables(spec),
      });
      contracts[spec.key] = await saveAt(contract, spec.createdAt);
    }

    // Expenses
    for (const [title, category, amount, paymentMethod, expenseDate] of EXPENSES) {
      await saveAt(new Expense({ title: `${EXPENSE_TAG}${title}`, category, amount, paymentMethod, expenseDate, createdBy: admin._id, notes: "Demo expense" }), expenseDate);
    }

    // Activity feed (most recent first on the dashboard)
    const fmt = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
    const ACTIVITY = [
      ["kapoor", "payment_added", `Payment received – ${fmt(35 * L)} (Cash)`, hoursAgo(1)],
      ["shakti", "payment_added", `Payment received – ${fmt(30 * L)} (Cheque)`, hoursAgo(3)],
      ["jewellers", "client_created", `Client "Sharma Jewellers (Demo)" was onboarded`, hoursAgo(5)],
      ["sunrise", "reminder_sent", `Payment reminder sent for ${fmt(90 * L)} balance`, hoursAgo(8)],
      ["agro", "status_changed", `Renewal due – Trade Fair Promotions 2025 (${fmt(1.1 * CR)})`, hoursAgo(20)],
      ["western", "payment_added", `Payment received – ${fmt(50 * L)} (Cash)`, hoursAgo(26)],
      ["apex", "contract_created", `Renewal contract "Digital Growth Retainer 2026" created (${fmt(2.1 * CR)})`, hoursAgo(40)],
      ["brightpath", "invoice_generated", `Invoice generated for ${fmt(68 * L)}`, hoursAgo(55)],
      ["sunrise", "payment_added", `Payment received – ${fmt(80 * L)} (RTGS)`, hoursAgo(70)],
      ["nova", "client_created", `Client "Nova Fintech Solutions (Demo)" was onboarded`, hoursAgo(90)],
    ];
    for (const [client, type, message, at] of ACTIVITY) {
      await saveAt(new ActivityLog({ clientId: clients[client]._id, type, message }), at);
    }

    console.log(`Seeded ${CLIENTS.length} demo clients, ${CONTRACTS.length} contracts, ${EXPENSES.length} expenses, ${ACTIVITY.length} activity entries.`);
    if (removed.contracts) console.log("(Replaced the previous demo set.)");
    console.log("Remove later with: npm run seed:sample-dashboard -- --remove");
  } catch (error) {
    console.error("Seeding sample dashboard data failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
