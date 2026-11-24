const mongoose = require("mongoose");
const { MEETING_MODES, MEETING_STATUSES, MEETING_OUTCOMES } = require("../utils/telecalling");

const MeetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    meetingDate: { type: Date, required: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    attendees: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Client meetings (booked by a telecaller for a sales person) ─────────
    // "internal" = the admin's own calendar entries (the original use);
    // "client" = a meeting with a lead/client, carrying the fields below.
    kind: { type: String, enum: ["internal", "client"], default: "internal" },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    company: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "TeleLead" },
    salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Who set it up: "telecaller" (booked on a call) or "sales" — added by a
    // sales person / sales manager themselves, e.g. a meeting found on the spot.
    source: { type: String, enum: ["telecaller", "sales"], default: "telecaller" },
    mode: { type: String, enum: MEETING_MODES },
    status: { type: String, enum: MEETING_STATUSES, default: "scheduled" },
    outcome: { type: String, enum: Object.keys(MEETING_OUTCOMES) },
    outcomeNotes: { type: String, trim: true, maxlength: 2000 },
    rescheduleCount: { type: Number, default: 0 },
    // Audit trail: every booking / status change / reschedule, newest last.
    history: [
      {
        _id: false,
        action: { type: String, trim: true },
        note: { type: String, trim: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

MeetingSchema.index({ kind: 1, salesPerson: 1, meetingDate: 1 });
MeetingSchema.index({ kind: 1, createdBy: 1, meetingDate: -1 });

// Today's Schedule on the dashboard filters meetings by meetingDate.
MeetingSchema.index({ meetingDate: 1 });

// Explicit collection name: the default "meetings" collides with an unrelated
// tenant-aware system sharing this MongoDB database (same reason Contract.js
// uses "clientContracts" and Expense.js uses "clientExpenses").
module.exports = mongoose.model("Meeting", MeetingSchema, "clientMeetings");
