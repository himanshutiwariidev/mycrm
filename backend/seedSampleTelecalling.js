// Seeds a realistic telecalling demo: 2 telecallers, their calling lists,
// 14 days of logged calls (with client responses and follow-ups), and client
// meetings booked for the demo sales person — some upcoming (incl. today),
// some completed / no-show / cancelled — so the Telecaller panel, the Sales
// "Meetings" tab and the admin Telecalling + Meetings views all have data.
//
//   npm run seed:sample-telecalling              add (or reset) the demo data
//   npm run seed:sample-telecalling -- --remove  delete everything it made
//
// Logins:  telecaller.demo@example.com / tele123   (Priya)
//          telecaller2.demo@example.com / tele123  (Aman)
//          sales.demo@example.com / sales123       (meetings are assigned here)
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Client = require("./models/Client");
const TeleLead = require("./models/TeleLead");
const CallLog = require("./models/CallLog");
const Meeting = require("./models/Meeting");
const ActivityLog = require("./models/ActivityLog");
const ClientVisit = require("./models/ClientVisit");
const { CALL_OUTCOMES, MEETING_OUTCOMES } = require("./utils/telecalling");

const isLocalDb = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "");
if (!isLocalDb || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: sample telecalling data runs only against a localhost MongoDB.");
  process.exit(1);
}

const TELECALLERS = [
  // startLeads on day one, then newPerDay fresh leads every morning (a real
  // calling list keeps getting topped up), plus a few uncalled ones today.
  { key: "priya", name: "Priya Nair (Demo)", email: "telecaller.demo@example.com", startLeads: 14, newPerDay: [4, 7], callsPerDay: [10, 17], upcoming: 3 },
  { key: "aman", name: "Aman Gupta (Demo)", email: "telecaller2.demo@example.com", startLeads: 10, newPerDay: [2, 4], callsPerDay: [5, 11], upcoming: 2 },
];
const DEMO_SALES = { name: "Rohit Verma (Demo)", email: "sales.demo@example.com", password: "sales123" };
const CLIENT_EMAIL_DOMAIN = "tele-demo.example.com";
const DAYS = 14;

// Deterministic randomness → the same demo every run.
let seed = 20261119;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const weighted = (entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) { if ((r -= w) < 0) return value; }
  return entries[0][0];
};

const FIRST = ["Rajesh", "Sneha", "Vikram", "Pooja", "Amit", "Neha", "Suresh", "Kavita", "Arjun", "Meera", "Rakesh", "Divya", "Manoj", "Anjali", "Sanjay", "Ritu", "Karan", "Swati", "Deepak", "Nisha", "Ashok", "Priyanka", "Gaurav", "Sunita", "Harish", "Pallavi", "Naveen", "Shalini", "Vivek", "Komal"];
const LAST = ["Sharma", "Patel", "Iyer", "Reddy", "Singh", "Kulkarni", "Joshi", "Menon", "Chopra", "Bansal", "Agarwal", "Desai", "Nair", "Malhotra", "Saxena", "Pillai", "Kapoor", "Bhatt", "Rao", "Verma"];
const BUSINESS = ["Traders", "Enterprises", "Foods", "Interiors", "Clinic", "Motors", "Textiles", "Realty", "Academy", "Electronics", "Pharma", "Logistics", "Jewellers", "Hospitality", "Fitness", "Studios", "Exports", "Solutions"];
const CITIES = ["Pune", "Mumbai", "Nagpur", "Indore", "Jaipur", "Lucknow", "Ahmedabad", "Bengaluru", "Hyderabad", "Nashik", "Surat", "Chandigarh"];
const REQUIREMENTS = [
  "New website with online booking", "Social media management for 3 platforms", "Google Ads for local leads",
  "SEO for existing website", "Mobile app for customers", "Brand video + reels", "Google My Business setup",
  "E-commerce store", "Lead-gen campaign for a new branch", "Website redesign + SEO",
];
const SOURCES = ["cold list", "cold list", "cold list", "website", "referral", "social media"];

const NOTES = {
  "meeting-scheduled": ["Keen to see a proposal, asked for an in-person meeting.", "Decision maker on the call — wants a demo this week.", "Comparing 2 agencies, agreed to meet our sales team."],
  interested: ["Interested, asked for pricing on WhatsApp.", "Likes the idea, wants to discuss with partner first.", "Positive — budget approval next week."],
  "call-back": ["In a meeting, asked to call back later.", "Travelling, call back after 2 days.", "Asked to call in the evening."],
  "not-interested": ["Already working with another agency.", "No budget this quarter.", "Not looking for marketing right now."],
  "no-answer": [""],
  busy: ["Line busy."],
  unreachable: ["Number switched off."],
  "wrong-number": ["Number belongs to someone else."],
};

const OUTCOME_WEIGHTS = [
  ["no-answer", 22], ["busy", 8], ["unreachable", 6], ["wrong-number", 2],
  ["call-back", 18], ["interested", 15], ["not-interested", 11], ["meeting-scheduled", 9],
];
const CLOSED = ["not-interested", "invalid", "meeting-scheduled", "converted"];

const now = new Date();
const atDay = (daysFromToday, hour, min = 0) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysFromToday, hour, min, 0);
  return d;
};

async function saveAt(doc, at) {
  doc.createdAt = at;
  if (doc.schema.path("updatedAt")) doc.updatedAt = at;
  await doc.save({ timestamps: false });
  return doc;
}

async function removeDemo() {
  const users = await User.find({ email: { $in: TELECALLERS.map((t) => t.email) } }).select("_id").lean();
  const ids = users.map((u) => u._id);
  const clientIds = await Client.distinct("_id", { email: new RegExp(`@${CLIENT_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`) });
  const [calls, leads, meetings, activity, clients, removedUsers] = await Promise.all([
    CallLog.deleteMany({ telecaller: { $in: ids } }),
    TeleLead.deleteMany({ telecaller: { $in: ids } }),
    Meeting.deleteMany({ kind: "client", createdBy: { $in: ids } }),
    ActivityLog.deleteMany({ clientId: { $in: clientIds } }),
    Client.deleteMany({ _id: { $in: clientIds } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  return { calls: calls.deletedCount, leads: leads.deletedCount, meetings: meetings.deletedCount, clients: clients.deletedCount, activity: activity.deletedCount, telecallers: removedUsers.deletedCount };
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const removed = await removeDemo();

    if (process.argv.includes("--remove")) {
      const sales = await User.findOne({ email: DEMO_SALES.email }).select("_id").lean();
      if (sales && !(await Client.exists({ salesPerson: sales._id })) && !(await ClientVisit.exists({ salesPerson: sales._id }))) {
        await User.deleteOne({ _id: sales._id });
        removed.salesUser = 1;
      }
      console.log("Removed demo telecalling data:", removed);
      return;
    }

    const password = await bcrypt.hash("tele123", 12);
    const sales = (await User.findOne({ email: DEMO_SALES.email }))
      || (await User.create({ name: DEMO_SALES.name, email: DEMO_SALES.email, password: await bcrypt.hash(DEMO_SALES.password, 12), role: "sales", isActive: true }));

    let phoneSeq = 0;
    let clientSeq = 0;
    const totals = { leads: 0, calls: 0, meetings: 0 };
    const meetingStatusCount = {};

    for (const t of TELECALLERS) {
      const user = await User.create({ name: t.name, email: t.email, password, role: "telecaller", isActive: true });

      // ── Calling list (topped up every morning) ──
      const leads = [];
      const addLead = async (created) => {
        const first = pick(FIRST);
        const last = pick(LAST);
        leads.push(await saveAt(new TeleLead({
          name: `${first} ${last}`,
          phone: `9${String(800000000 + (phoneSeq += 7919)).padStart(9, "0")}`,
          company: rand() < 0.85 ? `${last} ${pick(BUSINESS)}` : undefined,
          city: pick(CITIES),
          requirement: pick(REQUIREMENTS),
          source: pick(SOURCES),
          telecaller: user._id,
          status: "new",
        }), created));
      };
      for (let i = 0; i < t.startLeads; i += 1) await addLead(atDay(-DAYS, 9, between(0, 30)));

      // ── 14 days of calls, oldest first, so each lead's state evolves ──
      const meetingsToResolve = [];
      for (let day = -DAYS + 1; day <= 0; day += 1) {
        const isToday = day === 0;
        const fresh = between(...t.newPerDay);
        for (let i = 0; i < fresh; i += 1) await addLead(atDay(day, 9, between(0, 45)));
        const latestHour = isToday ? Math.min(now.getHours(), 18) : 18;
        if (latestHour < 10) continue;
        const callCount = isToday ? Math.round(between(...t.callsPerDay) * ((latestHour - 9) / 9)) : between(...t.callsPerDay);
        const times = Array.from({ length: callCount }, () => atDay(day, between(10, latestHour), between(0, 59))).filter((d) => d < now).sort((a, b) => a - b);

        for (const calledAt of times) {
          const open = leads.filter((l) => !CLOSED.includes(l.status));
          if (!open.length) break;
          // Prefer follow-ups that are due, like a real telecaller would.
          const due = open.filter((l) => l.nextFollowUpAt && l.nextFollowUpAt <= calledAt);
          const lead = due.length && rand() < 0.6 ? pick(due) : pick(open);

          let outcome = weighted(OUTCOME_WEIGHTS);
          if (outcome === "meeting-scheduled" && lead.callCount === 0 && rand() < 0.7) outcome = "interested";
          const meta = CALL_OUTCOMES[outcome];
          const followUpAt = ["call-back", "interested", "no-answer", "busy"].includes(outcome)
            ? new Date(calledAt.getFullYear(), calledAt.getMonth(), calledAt.getDate() + between(1, 3), pick([11, 12, 15, 16]), 0)
            : undefined;

          let meeting;
          if (outcome === "meeting-scheduled") {
            // Book it 1–4 days out; the most recent booking is forced to later today
            // (or tomorrow morning) so "Today" has something to show.
            const meetingDate = new Date(calledAt.getFullYear(), calledAt.getMonth(), calledAt.getDate() + between(1, 4), pick([11, 12, 15, 16]), pick([0, 30]));
            const mode = weighted([["in-person", 6], ["video", 3], ["phone", 1]]);
            clientSeq += 1;
            const client = await saveAt(new Client({
              clientName: lead.name,
              companyName: lead.company,
              phone: lead.phone,
              email: `lead${clientSeq}@${CLIENT_EMAIL_DOMAIN}`,
              city: lead.city,
              projectType: "service",
              leadSource: "telecaller",
              status: "open",
              salesPerson: sales._id,
              notes: lead.requirement,
            }), calledAt);
            meeting = await saveAt(new Meeting({
              kind: "client",
              title: `Client meeting – ${lead.company || lead.name}`,
              meetingDate,
              description: lead.requirement,
              location: mode === "in-person" ? `${lead.company || lead.name}, ${pick(["MG Road", "Station Road", "Civil Lines", "Ring Road", "Main Market"])}, ${lead.city}` : mode === "video" ? "https://meet.google.com/abc-defg-hij" : undefined,
              attendees: [sales.name, `${t.name} (telecaller)`],
              createdBy: user._id,
              contactName: lead.name,
              contactPhone: lead.phone,
              company: lead.company,
              clientId: client._id,
              lead: lead._id,
              salesPerson: sales._id,
              mode,
              status: "scheduled",
              history: [{ action: "booked", note: `Booked by ${t.name} for ${sales.name}`, by: user._id, at: calledAt }],
            }), calledAt);
            await saveAt(new ActivityLog({ clientId: client._id, type: "meeting_scheduled", message: `${t.name} (telecaller) booked a ${mode} meeting with ${sales.name}`, meta: { meetingId: meeting._id } }), calledAt);
            lead.clientId = client._id;
            meetingsToResolve.push({ meeting, lead, client });
            totals.meetings += 1;
          }

          await saveAt(new CallLog({
            telecaller: user._id,
            lead: lead._id,
            outcome,
            connected: meta.connected,
            durationSec: meta.connected ? between(45, outcome === "meeting-scheduled" ? 540 : 360) : 0,
            notes: pick(NOTES[outcome]) || undefined,
            followUpAt,
            meeting: meeting?._id,
            calledAt,
          }), calledAt);
          totals.calls += 1;

          lead.callCount += 1;
          lead.lastCallAt = calledAt;
          lead.lastOutcome = outcome;
          lead.status = meta.leadStatus;
          lead.nextFollowUpAt = CLOSED.includes(meta.leadStatus) ? undefined : followUpAt;
        }
      }

      // The most recent bookings land in the coming days (Priya's first one
      // later today when there's still time), so "Upcoming"/"Today" have data.
      // Separate slots per telecaller so the shared sales person is never double-booked.
      const upcomingSlots = t.key === "priya"
        ? [now.getHours() < 17 ? atDay(0, Math.min(now.getHours() + 2, 18), 0) : atDay(1, 10, 0), atDay(1, 16, 0), atDay(2, 12, 30)]
        : [atDay(1, 11, 30), atDay(3, 15, 0)];
      const recent = meetingsToResolve.slice(-t.upcoming);
      recent.forEach(({ meeting }, i) => { meeting.meetingDate = upcomingSlots[i]; });
      // Earlier bookings that would still be in the future go to distinct afternoon slots too.
      meetingsToResolve.slice(0, -t.upcoming).filter(({ meeting }) => meeting.meetingDate > now)
        .forEach(({ meeting }, i) => { meeting.meetingDate = atDay(4 + i, t.key === "priya" ? 11 : 15, 0); });

      for (let i = 0; i < 3; i += 1) await addLead(atDay(0, 9, 50 + i));
      totals.leads += leads.length;

      // ── Sales team's results for meetings that already happened ──
      for (const { meeting, lead, client } of meetingsToResolve) {
        if (meeting.meetingDate > now) { meetingStatusCount.scheduled = (meetingStatusCount.scheduled || 0) + 1; await meeting.save({ timestamps: false }); continue; }
        const status = weighted([["completed", 75], ["no-show", 15], ["cancelled", 10]]);
        const at = new Date(meeting.meetingDate.getTime() + 75 * 60000);
        meeting.status = status;
        if (status === "completed") {
          meeting.outcome = weighted([["converted", 40], ["interested", 30], ["follow-up", 15], ["not-interested", 15]]);
          meeting.outcomeNotes = {
            converted: "Signed up — sending contract today.",
            interested: "Liked the proposal, wants revised pricing.",
            "follow-up": "Needs to involve their partner, follow up next week.",
            "not-interested": "Budget too tight for now.",
          }[meeting.outcome];
          const result = MEETING_OUTCOMES[meeting.outcome];
          lead.status = result.leadStatus;
          client.status = result.clientStatus;
          await client.save({ timestamps: false });
          meeting.history.push({ action: `Completed — ${result.label}`, note: meeting.outcomeNotes, by: sales._id, at });
          await saveAt(new ActivityLog({ clientId: client._id, type: "meeting_completed", message: `${sales.name}: Completed — ${result.label}`, meta: { meetingId: meeting._id } }), at);
        } else if (status === "no-show") {
          lead.status = "follow-up";
          lead.nextFollowUpAt = new Date(at.getTime() + 24 * 3600e3);
          meeting.history.push({ action: "Client didn't show up", by: sales._id, at });
          await saveAt(new ActivityLog({ clientId: client._id, type: "meeting_no_show", message: `${sales.name}: Client didn't show up`, meta: { meetingId: meeting._id } }), at);
        } else {
          meeting.outcomeNotes = "Client asked to cancel — will reconnect next month.";
          meeting.history.push({ action: "Cancelled", note: meeting.outcomeNotes, by: sales._id, at });
        }
        meetingStatusCount[status] = (meetingStatusCount[status] || 0) + 1;
        await meeting.save({ timestamps: false });
      }

      for (const lead of leads) await lead.save({ timestamps: false });
    }

    console.log(`Seeded ${TELECALLERS.length} telecallers, ${totals.leads} leads, ${totals.calls} calls, ${totals.meetings} client meetings ${JSON.stringify(meetingStatusCount)}.`);
    if (removed.calls) console.log("(Replaced the previous demo set.)");
    console.log("Logins: telecaller.demo@example.com / tele123 · telecaller2.demo@example.com / tele123 · sales.demo@example.com / sales123");
    console.log("Remove later with: npm run seed:sample-telecalling -- --remove");
  } catch (error) {
    console.error("Seeding sample telecalling data failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
