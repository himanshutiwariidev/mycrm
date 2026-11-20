const mongoose = require("mongoose");
const TeleLead = require("../models/TeleLead");
const CallLog = require("../models/CallLog");
const Meeting = require("../models/Meeting");
const Client = require("../models/Client");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");
const {
  CALL_OUTCOMES, CLOSED_LEAD_STATUSES, LEAD_STATUSES, LEAD_SOURCES, MEETING_MODES, MEETING_OUTCOMES, normalizePhone,
} = require("../utils/telecalling");

const ONE_DAY = 24 * 60 * 60 * 1000;
const isId = (v) => mongoose.isValidObjectId(v);
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const fail = (res, status, message, extra = {}) => res.status(status).json({ message, ...extra });
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ?from=&to= → { from, to } (defaults: this calendar month). */
function parseRange(query) {
  const now = new Date();
  const from = parseDate(query.from) || new Date(now.getFullYear(), now.getMonth(), 1);
  const to = parseDate(query.to) || endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { from, to };
}

const fmtWhen = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const LEAD_FIELDS = (body) => ({
  name: str(body.name, 120),
  phone: body.phone !== undefined ? normalizePhone(body.phone) : undefined,
  company: str(body.company, 160),
  email: str(body.email, 160)?.toLowerCase(),
  city: str(body.city, 80),
  requirement: str(body.requirement, 1000),
  source: LEAD_SOURCES.includes(body.source) ? body.source : undefined,
});
const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ═══════════════════════════════════════════════════════════════════════════
// Leads (telecaller's calling list)
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/telecalling/leads — own leads (admin: any, or ?telecaller=). */
exports.listLeads = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "telecaller") filter.telecaller = req.user.id;
    else if (isId(req.query.telecaller)) filter.telecaller = req.query.telecaller;

    const base = { ...filter };
    if (LEAD_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.due === "today") {
      filter.nextFollowUpAt = { $lte: endOfDay() };
      filter.status = { $nin: CLOSED_LEAD_STATUSES };
    }
    const q = str(req.query.q, 80);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { company: rx }, { phone: rx }, { city: rx }];
    }

    const sort = req.query.due === "today" ? { nextFollowUpAt: 1 } : { updatedAt: -1 };
    const [leads, counts] = await Promise.all([
      TeleLead.find(filter).sort(sort).limit(500).lean(),
      TeleLead.aggregate([
        { $match: { ...base, ...(base.telecaller ? { telecaller: new mongoose.Types.ObjectId(base.telecaller) } : {}) } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
    ]);
    const statusCounts = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    return res.json({ leads, statusCounts, total: counts.reduce((s, c) => s + c.n, 0) });
  } catch (error) {
    console.error("listLeads:", error);
    return fail(res, 500, "Failed to load leads");
  }
};

/** POST /api/telecalling/leads — add a lead to your own list. */
exports.createLead = async (req, res) => {
  try {
    const data = defined(LEAD_FIELDS(req.body));
    if (!data.name) return fail(res, 400, "Lead name is required");
    if (!data.phone || data.phone.replace(/\D/g, "").length < 7) return fail(res, 400, "Enter a valid phone number");

    const existing = await TeleLead.findOne({ telecaller: req.user.id, phone: data.phone }).lean();
    if (existing) return fail(res, 409, `This number is already on your list as "${existing.name}"`, { lead: existing });

    const lead = await TeleLead.create({ ...data, telecaller: req.user.id });
    return res.status(201).json({ message: "Lead added", lead });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "This number is already on your list");
    console.error("createLead:", error);
    return fail(res, 500, "Failed to add lead");
  }
};

/** PUT /api/telecalling/leads/:id — edit lead details (owner or admin). */
exports.updateLead = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Lead not found");
    const scope = req.user.role === "admin" ? {} : { telecaller: req.user.id };
    const data = defined(LEAD_FIELDS(req.body));
    if (data.name === "") return fail(res, 400, "Lead name is required");
    if (req.body.nextFollowUpAt !== undefined) data.nextFollowUpAt = parseDate(req.body.nextFollowUpAt);

    const lead = await TeleLead.findOneAndUpdate({ _id: req.params.id, ...scope }, { $set: data }, { returnDocument: "after", runValidators: true });
    if (!lead) return fail(res, 404, "Lead not found");
    return res.json({ message: "Lead updated", lead });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "Another lead on your list already has this number");
    console.error("updateLead:", error);
    return fail(res, 500, "Failed to update lead");
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Calls
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Finds the CRM client for a lead (by link, then phone) or creates one owned
 * by the chosen sales person. An existing client that already belongs to a
 * different sales person keeps its owner — the meeting goes to them, so the
 * account and its meetings never end up split across two people.
 */
async function resolveClientForMeeting(lead, salesPersonId, projectType) {
  let client = lead.clientId ? await Client.findById(lead.clientId) : null;
  if (!client) client = await Client.findOne({ phone: { $in: [lead.phone, lead.phone.replace(/^\+91/, "")] } });

  if (client) {
    if (!client.salesPerson) {
      client.salesPerson = salesPersonId;
      await client.save();
    }
    return { client, salesPersonId: String(client.salesPerson) };
  }

  const emailTaken = lead.email ? await Client.exists({ email: lead.email }) : true;
  client = await Client.create({
    clientName: lead.name,
    companyName: lead.company,
    phone: lead.phone,
    ...(emailTaken ? {} : { email: lead.email }),
    city: lead.city,
    projectType: projectType === "product" ? "product" : "service",
    leadSource: "telecaller",
    status: "open",
    salesPerson: salesPersonId,
    notes: lead.requirement,
  });
  return { client, salesPersonId: String(salesPersonId), created: true };
}

/**
 * POST /api/telecalling/leads/:id/calls — log a call on one of your leads.
 * Body: { outcome, durationSec, notes, followUpAt, meeting? }. When the
 * outcome is "meeting-scheduled", `meeting` = { date, mode, location,
 * salesPersonId, agenda, projectType } books a client meeting for a sales
 * person (turning the lead into a CRM client if it isn't one yet).
 */
exports.logCall = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Lead not found");
    const lead = await TeleLead.findOne({ _id: req.params.id, telecaller: req.user.id });
    if (!lead) return fail(res, 404, "Lead not found");

    const outcome = req.body.outcome;
    const meta = CALL_OUTCOMES[outcome];
    if (!meta) return fail(res, 400, "Choose how the call went");

    const durationSec = Math.max(0, Math.min(4 * 3600, Math.round(Number(req.body.durationSec) || 0)));
    const notes = str(req.body.notes, 2000);
    const followUpAt = parseDate(req.body.followUpAt);
    if (req.body.followUpAt && !followUpAt) return fail(res, 400, "Invalid follow-up date");

    // ── Validate the meeting up front, before writing anything ────────────
    let meetingInput = null;
    let salesUser = null;
    if (outcome === "meeting-scheduled") {
      const m = req.body.meeting || {};
      const date = parseDate(m.date);
      if (!date) return fail(res, 400, "Pick the meeting date and time");
      if (date.getTime() < Date.now() - 60 * 60 * 1000) return fail(res, 400, "Meeting time is in the past");
      if (!MEETING_MODES.includes(m.mode)) return fail(res, 400, "Choose how the meeting will happen");
      if (!isId(m.salesPersonId)) return fail(res, 400, "Assign a sales person");
      salesUser = await User.findOne({ _id: m.salesPersonId, role: "sales", isActive: { $ne: false } }).select("name").lean();
      if (!salesUser) return fail(res, 400, "That sales person isn't available");
      if (m.mode === "in-person" && !str(m.location, 300)) return fail(res, 400, "Add the meeting address");
      meetingInput = { date, mode: m.mode, location: str(m.location, 300), agenda: str(m.agenda, 1000), projectType: m.projectType };
    }

    const telecaller = await User.findById(req.user.id).select("name").lean();
    const telecallerName = telecaller?.name || "Telecaller";

    // ── Book the meeting ──────────────────────────────────────────────────
    let meeting = null;
    let reassignedTo = null;
    if (meetingInput) {
      const { client, salesPersonId } = await resolveClientForMeeting(lead, salesUser._id, meetingInput.projectType);
      if (salesPersonId !== String(salesUser._id)) {
        const owner = await User.findById(salesPersonId).select("name").lean();
        salesUser = owner || salesUser;
        reassignedTo = owner?.name || null;
      }
      lead.clientId = client._id;

      meeting = await Meeting.create({
        kind: "client",
        title: `Client meeting – ${lead.company || lead.name}`,
        meetingDate: meetingInput.date,
        description: meetingInput.agenda,
        location: meetingInput.location,
        attendees: [salesUser.name, `${telecallerName} (telecaller)`],
        createdBy: req.user.id,
        contactName: lead.name,
        contactPhone: lead.phone,
        company: lead.company,
        clientId: client._id,
        lead: lead._id,
        salesPerson: salesUser._id,
        mode: meetingInput.mode,
        status: "scheduled",
        history: [{ action: "booked", note: `Booked by ${telecallerName} for ${salesUser.name}`, by: req.user.id }],
      });
      await logActivity(
        client._id,
        "meeting_scheduled",
        `${telecallerName} (telecaller) booked a ${meetingInput.mode} meeting with ${salesUser.name} for ${fmtWhen(meetingInput.date)}`,
        { meetingId: meeting._id }
      );
    }

    // ── Record the call + move the lead along ─────────────────────────────
    const call = await CallLog.create({
      telecaller: req.user.id,
      lead: lead._id,
      outcome,
      connected: meta.connected,
      durationSec,
      notes,
      followUpAt: followUpAt || undefined,
      meeting: meeting?._id,
    });

    lead.callCount += 1;
    lead.lastCallAt = call.calledAt;
    lead.lastOutcome = outcome;
    lead.status = meta.leadStatus;
    lead.nextFollowUpAt = CLOSED_LEAD_STATUSES.includes(meta.leadStatus) || outcome === "meeting-scheduled" ? undefined : followUpAt || undefined;
    await lead.save();

    return res.status(201).json({
      message: meeting ? `Meeting booked with ${salesUser.name}` : "Call logged",
      call,
      lead,
      meeting,
      reassignedTo,
    });
  } catch (error) {
    console.error("logCall:", error);
    return fail(res, 500, "Failed to log the call");
  }
};

/** GET /api/telecalling/calls — call history (own; admin: all or ?telecaller=). */
exports.listCalls = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "telecaller") filter.telecaller = req.user.id;
    else if (isId(req.query.telecaller)) filter.telecaller = req.query.telecaller;
    if (CALL_OUTCOMES[req.query.outcome]) filter.outcome = req.query.outcome;
    if (isId(req.query.lead)) filter.lead = req.query.lead;
    if (req.query.from || req.query.to) {
      const { from, to } = parseRange(req.query);
      filter.calledAt = { $gte: from, $lte: to };
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [calls, total] = await Promise.all([
      CallLog.find(filter)
        .sort({ calledAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("lead", "name company phone status")
        .populate("telecaller", "name")
        .lean(),
      CallLog.countDocuments(filter),
    ]);
    return res.json({ calls, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error("listCalls:", error);
    return fail(res, 500, "Failed to load calls");
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Stats
// ═══════════════════════════════════════════════════════════════════════════

/** Call metrics for `match` within [from, to], plus a per-day trend. */
async function callMetrics(match, from, to) {
  const calls = await CallLog.find({ ...match, calledAt: { $gte: from, $lte: to } })
    .select("calledAt outcome connected durationSec telecaller lead")
    .lean();

  const outcomes = Object.fromEntries(Object.keys(CALL_OUTCOMES).map((k) => [k, 0]));
  let connected = 0;
  let talkSec = 0;
  calls.forEach((c) => {
    outcomes[c.outcome] = (outcomes[c.outcome] || 0) + 1;
    if (c.connected) {
      connected += 1;
      talkSec += c.durationSec || 0;
    }
  });

  // Day buckets up to today (no empty future days), max 62 so long ranges stay readable.
  const days = [];
  const lastDay = new Date(Math.min(to.getTime(), endOfDay().getTime()));
  const firstDay = startOfDay(new Date(Math.max(from.getTime(), lastDay.getTime() - 61 * ONE_DAY)));
  for (let d = firstDay; d <= lastDay; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push({ date: d, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), calls: 0, connected: 0, meetings: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [startOfDay(d.date).getTime(), i]));
  calls.forEach((c) => {
    const i = dayIndex.get(startOfDay(new Date(c.calledAt)).getTime());
    if (i === undefined) return;
    days[i].calls += 1;
    if (c.connected) days[i].connected += 1;
    if (c.outcome === "meeting-scheduled") days[i].meetings += 1;
  });

  const total = calls.length;
  return {
    calls,
    summary: {
      totalCalls: total,
      connected,
      connectRate: total ? Math.round((connected / total) * 100) : 0,
      meetingsBooked: outcomes["meeting-scheduled"],
      meetingRate: connected ? Math.round((outcomes["meeting-scheduled"] / connected) * 100) : 0,
      avgTalkSec: connected ? Math.round(talkSec / connected) : 0,
      uniqueLeads: new Set(calls.map((c) => String(c.lead))).size,
    },
    outcomes,
    trend: days.map(({ label, calls: n, connected: c, meetings }) => ({ label, calls: n, connected: c, notConnected: n - c, meetings })),
  };
}

/** GET /api/telecalling/stats — the logged-in telecaller's dashboard numbers. */
exports.myStats = async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id);
    const { from, to } = parseRange(req.query);
    const today = { from: startOfDay(), to: endOfDay() };

    const [period, todayMetrics, followUpsDue, overdueFollowUps, leadsTotal, upcomingMeetings, meetingStatus] = await Promise.all([
      callMetrics({ telecaller: me }, from, to),
      callMetrics({ telecaller: me }, today.from, today.to),
      TeleLead.find({ telecaller: me, status: { $nin: CLOSED_LEAD_STATUSES }, nextFollowUpAt: { $lte: endOfDay() } })
        .sort({ nextFollowUpAt: 1 }).limit(8).lean(),
      TeleLead.countDocuments({ telecaller: me, status: { $nin: CLOSED_LEAD_STATUSES }, nextFollowUpAt: { $lt: startOfDay() } }),
      TeleLead.countDocuments({ telecaller: me }),
      Meeting.find({ kind: "client", createdBy: me, status: "scheduled", meetingDate: { $gte: startOfDay() } })
        .sort({ meetingDate: 1 }).limit(5).populate("salesPerson", "name").lean(),
      Meeting.aggregate([
        { $match: { kind: "client", createdBy: me, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
    ]);
    const followUpsDueCount = await TeleLead.countDocuments({ telecaller: me, status: { $nin: CLOSED_LEAD_STATUSES }, nextFollowUpAt: { $lte: endOfDay() } });

    return res.json({
      range: { from, to },
      today: todayMetrics.summary,
      period: period.summary,
      outcomes: period.outcomes,
      trend: period.trend,
      followUps: { due: followUpsDueCount, overdue: overdueFollowUps, list: followUpsDue },
      leadsTotal,
      upcomingMeetings,
      meetingStatus: Object.fromEntries(meetingStatus.map((m) => [m._id, m.n])),
    });
  } catch (error) {
    console.error("myStats:", error);
    return fail(res, 500, "Failed to load your stats");
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Meetings
// ═══════════════════════════════════════════════════════════════════════════

const MEETING_POPULATE = [
  { path: "salesPerson", select: "name email" },
  { path: "createdBy", select: "name role" },
  { path: "clientId", select: "clientName companyName status city" },
];

function meetingScopeFilter(scope) {
  const now = new Date();
  if (scope === "today") return { meetingDate: { $gte: startOfDay(now), $lte: endOfDay(now) } };
  if (scope === "upcoming") return { meetingDate: { $gte: startOfDay(now) }, status: "scheduled" };
  if (scope === "past") return { $or: [{ meetingDate: { $lt: startOfDay(now) } }, { status: { $ne: "scheduled" } }] };
  return {};
}

/** GET /api/telecalling/meetings/booked — meetings this telecaller booked. */
exports.bookedMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ kind: "client", createdBy: req.user.id, ...meetingScopeFilter(req.query.scope) })
      .sort({ meetingDate: -1 }).limit(200).populate(MEETING_POPULATE).lean();
    return res.json({ meetings });
  } catch (error) {
    console.error("bookedMeetings:", error);
    return fail(res, 500, "Failed to load meetings");
  }
};

/** GET /api/telecalling/meetings/assigned — sales person's client meetings. */
exports.assignedMeetings = async (req, res) => {
  try {
    const scope = req.query.scope || "upcoming";
    const meetings = await Meeting.find({ kind: "client", salesPerson: req.user.id, ...meetingScopeFilter(scope) })
      .sort({ meetingDate: scope === "past" ? -1 : 1 }).limit(200).populate(MEETING_POPULATE).lean();
    const now = new Date();
    const [todayCount, upcomingCount] = await Promise.all([
      Meeting.countDocuments({ kind: "client", salesPerson: req.user.id, status: "scheduled", meetingDate: { $gte: startOfDay(now), $lte: endOfDay(now) } }),
      Meeting.countDocuments({ kind: "client", salesPerson: req.user.id, status: "scheduled", meetingDate: { $gte: startOfDay(now) } }),
    ]);
    return res.json({ meetings, counts: { today: todayCount, upcoming: upcomingCount } });
  } catch (error) {
    console.error("assignedMeetings:", error);
    return fail(res, 500, "Failed to load meetings");
  }
};

/** GET /api/telecalling/admin/meetings — every client meeting (admin). */
exports.adminMeetings = async (req, res) => {
  try {
    const filter = { kind: "client", ...meetingScopeFilter(req.query.scope) };
    if (["scheduled", "completed", "no-show", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
    if (isId(req.query.salesPerson)) filter.salesPerson = req.query.salesPerson;
    if (isId(req.query.telecaller)) filter.createdBy = req.query.telecaller;
    const meetings = await Meeting.find(filter)
      .sort({ meetingDate: ["past", "all"].includes(req.query.scope) ? -1 : 1 }).limit(300).populate(MEETING_POPULATE).lean();
    const statusCounts = await Meeting.aggregate([{ $match: { kind: "client" } }, { $group: { _id: "$status", n: { $sum: 1 } } }]);
    return res.json({ meetings, statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])) });
  } catch (error) {
    console.error("adminMeetings:", error);
    return fail(res, 500, "Failed to load meetings");
  }
};

/**
 * PUT /api/telecalling/meetings/:id/status — assigned sales person (or admin)
 * records what happened. Body: { status: completed|no-show|cancelled|
 * rescheduled, outcome (completed), notes, newDate (rescheduled) }.
 * Completed meetings push their outcome onto the lead and the CRM client.
 */
exports.updateMeetingStatus = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Meeting not found");
    const scope = req.user.role === "admin" ? {} : { salesPerson: req.user.id };
    const meeting = await Meeting.findOne({ _id: req.params.id, kind: "client", ...scope });
    if (!meeting) return fail(res, 404, "Meeting not found");

    const { status } = req.body;
    const notes = str(req.body.notes, 2000);
    const actor = (await User.findById(req.user.id).select("name").lean())?.name || "Sales";
    let action;

    if (status === "rescheduled") {
      const newDate = parseDate(req.body.newDate);
      if (!newDate) return fail(res, 400, "Pick the new date and time");
      if (newDate.getTime() < Date.now() - 60 * 60 * 1000) return fail(res, 400, "New time is in the past");
      action = `Rescheduled from ${fmtWhen(meeting.meetingDate)} to ${fmtWhen(newDate)}`;
      meeting.meetingDate = newDate;
      meeting.status = "scheduled";
      meeting.rescheduleCount = (meeting.rescheduleCount || 0) + 1;
    } else if (status === "completed") {
      if (!MEETING_OUTCOMES[req.body.outcome]) return fail(res, 400, "Choose the meeting result");
      meeting.status = "completed";
      meeting.outcome = req.body.outcome;
      action = `Completed — ${MEETING_OUTCOMES[req.body.outcome].label}`;
    } else if (status === "no-show" || status === "cancelled") {
      meeting.status = status;
      action = status === "no-show" ? "Client didn't show up" : "Cancelled";
    } else {
      return fail(res, 400, "Unknown status");
    }

    if (notes) meeting.outcomeNotes = notes;
    meeting.history.push({ action, note: notes, by: req.user.id });
    await meeting.save();

    // Feed the result back to the lead (telecaller's view) and the client.
    if (status === "completed") {
      const result = MEETING_OUTCOMES[meeting.outcome];
      if (meeting.lead) await TeleLead.updateOne({ _id: meeting.lead }, { $set: { status: result.leadStatus } });
      if (meeting.clientId) await Client.updateOne({ _id: meeting.clientId }, { $set: { status: result.clientStatus } });
    } else if (status === "no-show" && meeting.lead) {
      // Back to the telecaller to re-engage tomorrow.
      await TeleLead.updateOne({ _id: meeting.lead }, { $set: { status: "follow-up", nextFollowUpAt: new Date(Date.now() + ONE_DAY) } });
    }
    if (meeting.clientId) {
      await logActivity(meeting.clientId, `meeting_${status === "rescheduled" ? "rescheduled" : status.replace("-", "_")}`, `${actor}: ${action}`, { meetingId: meeting._id });
    }

    await meeting.populate(MEETING_POPULATE);
    return res.json({ message: action, meeting });
  } catch (error) {
    console.error("updateMeetingStatus:", error);
    return fail(res, 500, "Failed to update the meeting");
  }
};

/** GET /api/telecalling/sales-people — who a meeting can be assigned to. */
exports.salesPeople = async (req, res) => {
  try {
    const users = await User.find({ role: "sales", isActive: { $ne: false } }).select("name email").sort({ name: 1 }).lean();
    return res.json({ salesPeople: users });
  } catch (error) {
    console.error("salesPeople:", error);
    return fail(res, 500, "Failed to load sales team");
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Admin overview
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/telecalling/admin/overview?from&to&telecaller — team performance. */
exports.adminOverview = async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const match = isId(req.query.telecaller) ? { telecaller: new mongoose.Types.ObjectId(req.query.telecaller) } : {};
    const telecallers = await User.find({ role: "telecaller" }).select("name email isActive").sort({ name: 1 }).lean();

    const [metrics, meetingRows, followUpRows, recentCalls] = await Promise.all([
      callMetrics(match, from, to),
      Meeting.aggregate([
        { $match: { kind: "client", createdAt: { $gte: from, $lte: to }, ...(match.telecaller ? { createdBy: match.telecaller } : {}) } },
        { $group: { _id: { by: "$createdBy", status: "$status" }, n: { $sum: 1 } } },
      ]),
      TeleLead.aggregate([
        { $match: { status: { $nin: CLOSED_LEAD_STATUSES }, nextFollowUpAt: { $lte: endOfDay() }, ...match } },
        { $group: { _id: "$telecaller", n: { $sum: 1 } } },
      ]),
      CallLog.find({ ...match, calledAt: { $gte: from, $lte: to } })
        .sort({ calledAt: -1 }).limit(12).populate("lead", "name company").populate("telecaller", "name").lean(),
    ]);

    // Per-telecaller leaderboard
    const rows = new Map(telecallers.map((t) => [String(t._id), {
      telecaller: { _id: t._id, name: t.name, email: t.email, isActive: t.isActive !== false },
      calls: 0, connected: 0, meetingsBooked: 0, meetingsCompleted: 0, converted: 0, talkSec: 0, followUpsDue: 0,
    }]));
    metrics.calls.forEach((c) => {
      const row = rows.get(String(c.telecaller));
      if (!row) return;
      row.calls += 1;
      if (c.connected) { row.connected += 1; row.talkSec += c.durationSec || 0; }
      if (c.outcome === "meeting-scheduled") row.meetingsBooked += 1;
    });
    const meetingStatus = {};
    meetingRows.forEach((m) => {
      meetingStatus[m._id.status] = (meetingStatus[m._id.status] || 0) + m.n;
      const row = rows.get(String(m._id.by));
      if (row && m._id.status === "completed") row.meetingsCompleted += m.n;
    });
    followUpRows.forEach((f) => { const row = rows.get(String(f._id)); if (row) row.followUpsDue = f.n; });

    const convertedByTelecaller = await Meeting.aggregate([
      { $match: { kind: "client", status: "completed", outcome: "converted", createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$createdBy", n: { $sum: 1 } } },
    ]);
    convertedByTelecaller.forEach((c) => { const row = rows.get(String(c._id)); if (row) row.converted = c.n; });

    const leaderboard = [...rows.values()]
      .filter((r) => !match.telecaller || String(r.telecaller._id) === String(match.telecaller))
      .map((r) => ({
        ...r,
        connectRate: r.calls ? Math.round((r.connected / r.calls) * 100) : 0,
        avgTalkSec: r.connected ? Math.round(r.talkSec / r.connected) : 0,
      }))
      .sort((a, b) => b.meetingsBooked - a.meetingsBooked || b.calls - a.calls);

    return res.json({
      range: { from, to },
      summary: {
        ...metrics.summary,
        telecallers: telecallers.length,
        meetingsCompleted: meetingStatus.completed || 0,
        converted: convertedByTelecaller.reduce((s, c) => s + c.n, 0),
        followUpsDue: followUpRows.reduce((s, f) => s + f.n, 0),
      },
      outcomes: metrics.outcomes,
      trend: metrics.trend,
      meetingStatus,
      leaderboard,
      recentCalls,
    });
  } catch (error) {
    console.error("adminOverview:", error);
    return fail(res, 500, "Failed to load telecalling overview");
  }
};
