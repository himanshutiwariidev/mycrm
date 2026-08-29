const mongoose = require("mongoose");

const ContractSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    projectDescription: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
    },
    projectScope: {
      type: String,
      trim: true,
    },
    timeline: {
      type: String,
      trim: true,
    },
    // Contract End Date reuses the existing validUntil field below (same
    // semantic meaning) rather than duplicating it — only the start date is new.
    contractStartDate: {
      type: Date,
    },
    // The final, GST-inclusive total — the actual amount owed/collected.
    // Equal to preTaxAmount when GST isn't enabled, so this stays exactly
    // what it always was for every contract created before GST support.
    projectAmount: {
      type: Number,
      required: [true, "Project amount is required"],
      min: 0,
    },
    // Base amount entered on Step 1, before GST — kept separately so an
    // existing contract can be re-edited without having to back-calculate
    // the pre-tax figure from projectAmount.
    preTaxAmount: {
      type: Number,
      default: 0,
    },
    gstEnabled: {
      type: Boolean,
      default: false,
    },
    gstPercent: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },
    // TDS is admin record-keeping only — it never affects projectAmount,
    // receivedAmount, or dueAmount.
    tdsEnabled: {
      type: Boolean,
      default: false,
    },
    tdsPercent: {
      type: Number,
      default: 0,
    },
    tdsAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    // The contract's primary/last-known payment method — an editable summary
    // field, distinct from the per-payment `payments[].method` ledger entries.
    // Includes legacy spreadsheet values so imports can preserve source data.
    paymentMethod: {
      type: String,
      enum: ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "3 Parts", "P Account", "Other"],
      default: "Cash",
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    validUntil: {
      type: Date,
    },
    contractStatus: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    // Renewal tracking reuses validUntil as the renewal date and projectAmount
    // as the renewal amount — this field is only the lifecycle status on top
    // of that: auto-derived as Upcoming/Overdue from validUntil vs today
    // unless an admin has explicitly marked it Completed (renewed).
    renewalStatus: {
      type: String,
      enum: ["Upcoming", "Overdue", "Completed"],
      default: "Upcoming",
    },
    sentAt: {
      type: Date,
    },
    sentTo: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    responseDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    deliverables: [
      {
        title: { type: String, trim: true, required: true },
        quantity: { type: Number, required: true, min: 0 },
        delivered: { type: Number, default: 0, min: 0 },
        frequency: {
          type: String,
          enum: ["one-time", "week", "month", "year"],
          default: "one-time",
        },
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },
        // Links this deliverable back to the service/leaf it was generated
        // from in the contract builder (config/services/*.js), so the UI can
        // show only the fields that actually apply to that service instead of
        // a one-size-fits-all quantity/frequency form. Absent on legacy or
        // manually-added deliverables, which fall back to "quantity" tracking.
        categoryId: { type: String },
        path: { type: String },
        trackingMode: {
          type: String,
          enum: ["quantity", "status"],
          default: "quantity",
        },
        // Service-specific measurement model (e.g. "pages" for Web
        // Development, "campaigns" for Sponsored Ads, "screens" for Mobile
        // App Development) so the UI can show the right unit instead of a
        // one-size-fits-all quantity. Absent on legacy/generic deliverables,
        // which fall back to plain quantity/frequency display.
        unit: { type: String },
        metadata: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        paymentDate: { type: Date, default: Date.now },
        method: {
          type: String,
          // "Bank Transfer", "Card", and "Razorpay" are kept in the enum only
          // so older payment records already saved with those values still pass
          // validation — the UI no longer offers them.
          enum: ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "3 Parts", "P Account", "Other", "Bank Transfer", "Card", "Razorpay"],
          default: "Other",
        },
        notes: { type: String, trim: true },
      },
    ],
    receivedAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    nextDueDate: {
      type: Date,
    },
    selectedServices: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    piAttachment: {
      filename: { type: String },
      originalname: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date },
    },
    pricingSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    importDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

ContractSchema.pre("save", function () {
  // Deliverable due/pending/status are time-dependent (especially for recurring
  // weekly/monthly scope) so they're computed on read via utils/deliverableStats.js
  // instead of being persisted here.

  this.receivedAmount = this.payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );
  this.dueAmount = (this.projectAmount || 0) - this.receivedAmount;
});

// Dashboard analytics filter/group by these fields (status breakdowns, renewal
// windows keyed off validUntil, payment-mode splits, date-range scoping) —
// indexed to keep those queries fast as data grows. Note: selectedServices is
// a Mixed field (deliberately, so new service categories don't need schema
// changes — see the field definition above), so it can't be reliably indexed
// into its nested categoryId the way a typed sub-schema could.
ContractSchema.index({ contractStatus: 1 });
ContractSchema.index({ validUntil: 1 });
ContractSchema.index({ createdAt: 1 });
ContractSchema.index({ "payments.method": 1 });

// Explicit collection name: the default "contracts" collides with an unrelated
// tenant-aware system sharing this MongoDB database, which enforces a legacy
// unique index on (proposalNumber, tenantId) that our documents never satisfy.
module.exports = mongoose.model("Contract", ContractSchema, "clientContracts");
