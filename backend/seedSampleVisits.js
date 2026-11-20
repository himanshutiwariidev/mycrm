// Seeds demo data for the Client Visits feature: 1 demo sales person, 3 demo
// clients assigned to them, and 3 location check-ins (completed, completed with
// low accuracy + no check-out location, and one still in progress).
//
//   npm run seed:sample-visits             add (or reset) the demo data
//   npm run seed:sample-visits -- --remove  delete every record this script made
//
// Everything is keyed off the demo sales user's email, so re-running replaces
// the previous demo set instead of duplicating it, and --remove leaves real
// data untouched.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Client = require("./models/Client");
const ClientVisit = require("./models/ClientVisit");
const ActivityLog = require("./models/ActivityLog");
const Meeting = require("./models/Meeting");

const DEMO_SALES = { name: "Rohit Verma (Demo)", email: "sales.demo@example.com", password: "sales123" };

const DEMO_CLIENTS = [
  { key: "sweets", clientName: "Anil Sharma", companyName: "Sharma Sweets (Demo)", city: "Lucknow", state: "Uttar Pradesh", phone: "9000000001", email: "sharma.sweets.demo@example.com", lat: 26.8505, lng: 80.9462 },
  { key: "electronics", clientName: "Neha Gupta", companyName: "Gupta Electronics (Demo)", city: "New Delhi", state: "Delhi", phone: "9000000002", email: "gupta.electronics.demo@example.com", lat: 28.6315, lng: 77.2167 },
  { key: "textiles", clientName: "Vikas Verma", companyName: "Verma Textiles (Demo)", city: "Noida", state: "Uttar Pradesh", phone: "9000000003", email: "verma.textiles.demo@example.com", lat: 28.5708, lng: 77.3261 },
];

// Local-only guard, same as seedAdmin.js: never write demo data to a remote DB.
const isLocalDb = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "");
if (!isLocalDb || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: sample visits run only against a localhost MongoDB.");
  process.exit(1);
}

const minutesAgo = (m) => new Date(Date.now() - m * 60000);
/** A time `daysBack` days ago at hh:mm local time. */
const dayAt = (daysBack, hh, mm) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hh, mm, 0, 0);
  return d;
};
/** Nudges a point by a few metres so check-in/out aren't identical. */
const nudge = (v, metres) => v + metres / 111000;

async function removeDemoData() {
  const salesUser = await User.findOne({ email: DEMO_SALES.email }).select("_id").lean();
  const clientIds = await Client.distinct("_id", { email: { $in: DEMO_CLIENTS.map((c) => c.email) } });
  const [visits, logs, clients] = await Promise.all([
    salesUser ? ClientVisit.deleteMany({ salesPerson: salesUser._id }) : { deletedCount: 0 },
    ActivityLog.deleteMany({ clientId: { $in: clientIds } }),
    Client.deleteMany({ _id: { $in: clientIds } }),
  ]);
  return { visits: visits.deletedCount, activity: logs.deletedCount, clients: clients.deletedCount };
}

/**
 * The demo sales user is shared with seedSampleDashboard.js and
 * seedSampleTelecalling.js (their clients and meetings point at it), so it
 * is reused — never deleted and recreated with a new id — and only removed
 * on --remove once nothing else references it.
 */
async function demoSalesUser() {
  return (await User.findOne({ email: DEMO_SALES.email })) || User.create({
    name: DEMO_SALES.name,
    email: DEMO_SALES.email,
    password: await bcrypt.hash(DEMO_SALES.password, 12),
    role: "sales",
    isActive: true,
  });
}

async function saveAt(doc, at) {
  doc.createdAt = at;
  if ("updatedAt" in doc.schema.paths) doc.updatedAt = at;
  await doc.save({ timestamps: false });
  return doc;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const removed = await removeDemoData();
    if (process.argv.includes("--remove")) {
      const sales = await User.findOne({ email: DEMO_SALES.email }).select("_id").lean();
      const stillUsed = sales && ((await Client.exists({ salesPerson: sales._id })) || (await Meeting.exists({ salesPerson: sales._id })));
      if (sales && !stillUsed) {
        await User.deleteOne({ _id: sales._id });
        removed.salesUser = 1;
      }
      console.log("Removed demo data:", removed);
      return;
    }

    const salesUser = await demoSalesUser();

    const clients = {};
    for (const c of DEMO_CLIENTS) {
      clients[c.key] = await Client.create({
        clientName: c.clientName,
        companyName: c.companyName,
        email: c.email,
        phone: c.phone,
        city: c.city,
        state: c.state,
        country: "India",
        projectType: "service",
        leadSource: "visit",
        status: "converted",
        salesPerson: salesUser._id,
      });
    }

    const loc = Object.fromEntries(DEMO_CLIENTS.map((c) => [c.key, c]));
    const visits = [
      {
        client: "sweets",
        purpose: "Renewal discussion",
        status: "completed",
        checkIn: { at: dayAt(2, 11, 5), lat: loc.sweets.lat, lng: loc.sweets.lng, accuracy: 12 },
        checkOut: { at: dayAt(2, 11, 52), lat: nudge(loc.sweets.lat, 8), lng: nudge(loc.sweets.lng, 5), accuracy: 9 },
        outcome: "Agreed to renew the Social Media package for 12 months. Send revised quote by Monday.",
      },
      {
        client: "electronics",
        purpose: "Payment follow-up",
        status: "completed",
        // Indoors / weak GPS: device reported a wide radius, and location was
        // denied on the way out — shows the "Low accuracy" + "not shared" states.
        checkIn: { at: dayAt(1, 15, 10), lat: nudge(loc.electronics.lat, 220), lng: nudge(loc.electronics.lng, -140), accuracy: 650 },
        checkOut: { at: dayAt(1, 15, 34) },
        outcome: "₹25,000 balance to be paid by Friday via UPI.",
      },
      {
        client: "textiles",
        purpose: "New website demo",
        status: "in-progress",
        checkIn: { at: minutesAgo(20), lat: loc.textiles.lat, lng: loc.textiles.lng, accuracy: 18 },
      },
    ];

    for (const v of visits) {
      const client = clients[v.client];
      const checkIn = { ...v.checkIn, deviceTime: v.checkIn.at };
      const checkOut = v.checkOut ? { ...v.checkOut, ...(v.checkOut.lat ? { deviceTime: v.checkOut.at } : {}) } : undefined;

      await saveAt(
        new ClientVisit({ salesPerson: salesUser._id, clientId: client._id, purpose: v.purpose, status: v.status, checkIn, checkOut, outcome: v.outcome }),
        v.checkIn.at
      );
      // Mirror what the real check-in/out endpoints write to the client timeline.
      await saveAt(
        new ActivityLog({ clientId: client._id, type: "meeting_check_in", message: `${DEMO_SALES.name} checked in for a client meeting (location shared) — ${v.purpose}` }),
        v.checkIn.at
      );
      if (checkOut) {
        const minutes = Math.round((checkOut.at - checkIn.at) / 60000);
        await saveAt(
          new ActivityLog({ clientId: client._id, type: "meeting_check_out", message: `${DEMO_SALES.name} ended the client meeting after ${minutes} min${checkOut.lat ? "" : " (location not shared)"}` }),
          checkOut.at
        );
      }
    }

    console.log(`Demo sales login: ${DEMO_SALES.email} / ${DEMO_SALES.password}`);
    console.log(`Seeded ${DEMO_CLIENTS.length} demo clients and ${visits.length} client visits.`);
    console.log("Remove later with: npm run seed:sample-visits -- --remove");
  } catch (error) {
    console.error("Seeding sample visits failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
