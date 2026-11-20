const mongoose = require("mongoose");
const { CALL_OUTCOMES } = require("../utils/telecalling");

/**
 * One phone call made by a telecaller. `calledAt` is the server's time
 * (authoritative for "calls today" counts); `connected` is derived from the
 * outcome and stored so stats can group on it cheaply.
 */
const CallLogSchema = new mongoose.Schema(
  {
    telecaller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "TeleLead", required: true },
    outcome: { type: String, enum: Object.keys(CALL_OUTCOMES), required: true },
    connected: { type: Boolean, default: false },
    durationSec: { type: Number, min: 0, max: 4 * 3600, default: 0 },
    notes: { type: String, trim: true, maxlength: 2000 },
    followUpAt: { type: Date },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
    calledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CallLogSchema.index({ telecaller: 1, calledAt: -1 });
CallLogSchema.index({ calledAt: -1 });
CallLogSchema.index({ lead: 1, calledAt: -1 });

module.exports = mongoose.model("CallLog", CallLogSchema, "teleCallLogs");
