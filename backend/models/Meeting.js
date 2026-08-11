const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    meetingDate: { type: Date, required: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    attendees: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Today's Schedule on the dashboard filters meetings by meetingDate.
MeetingSchema.index({ meetingDate: 1 });

// Explicit collection name: the default "meetings" collides with an unrelated
// tenant-aware system sharing this MongoDB database (same reason Contract.js
// uses "clientContracts" and Expense.js uses "clientExpenses").
module.exports = mongoose.model("Meeting", MeetingSchema, "clientMeetings");
