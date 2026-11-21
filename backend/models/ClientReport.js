const mongoose = require("mongoose");

/**
 * A monthly report for one service of a client's contract — e.g. the SEO
 * report for 1–31 Oct 2026. Either an uploaded file (PDF, Word, Excel, CSV —
 * stored privately in backend/storage/client-reports, downloaded through the
 * API) or a link (e.g. a Google Sheet). Several per service-month are allowed.
 */
const ClientReportSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: "Contract", required: true },
    categoryId: { type: String, required: true, trim: true }, // service, e.g. "socialMedia"
    period: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // "YYYY-MM"

    kind: { type: String, enum: ["file", "link"], required: true },
    // kind "file"
    filename: { type: String },
    originalname: { type: String, trim: true, maxlength: 200 },
    format: { type: String, enum: ["pdf", "doc", "docx", "xls", "xlsx", "csv"] },
    size: { type: Number, min: 0 },
    // kind "link"
    url: { type: String, trim: true, maxlength: 2000 },

    note: { type: String, trim: true, maxlength: 300 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ClientReportSchema.index({ clientId: 1, period: -1 });

// Explicit collection name: this MongoDB database is shared with an unrelated
// system, so default names risk collisions (see Meeting.js / Contract.js).
module.exports = mongoose.model("ClientReport", ClientReportSchema, "clientReports");
