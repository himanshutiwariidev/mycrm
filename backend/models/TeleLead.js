const mongoose = require("mongoose");
const { LEAD_STATUSES, LEAD_SOURCES, CALL_OUTCOMES } = require("../utils/telecalling");

/**
 * A person a telecaller is working: their own calling list. Kept separate
 * from Client on purpose — most numbers never become customers. A lead is
 * turned into a real CRM Client (owned by a sales person) only when the
 * telecaller books a meeting; `clientId` links the two from then on.
 */
const TeleLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Lead name is required"], trim: true, maxlength: 120 },
    phone: { type: String, required: [true, "Phone number is required"], trim: true, maxlength: 20 },
    company: { type: String, trim: true, maxlength: 160 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 80 },
    requirement: { type: String, trim: true, maxlength: 1000 },
    source: { type: String, enum: LEAD_SOURCES, default: "cold list" },

    telecaller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },
    callCount: { type: Number, default: 0, min: 0 },
    lastCallAt: { type: Date },
    lastOutcome: { type: String, enum: Object.keys(CALL_OUTCOMES) },
    nextFollowUpAt: { type: Date },

    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  },
  { timestamps: true }
);

TeleLeadSchema.index({ telecaller: 1, status: 1, updatedAt: -1 });
TeleLeadSchema.index({ telecaller: 1, nextFollowUpAt: 1 });
// One entry per number per telecaller (the same number can sit on two
// telecallers' lists, but not twice on one).
TeleLeadSchema.index({ telecaller: 1, phone: 1 }, { unique: true });

// Explicit collection name — this database is shared with another system.
module.exports = mongoose.model("TeleLead", TeleLeadSchema, "teleLeads");
