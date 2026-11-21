const mongoose = require("mongoose");

/**
 * Proof of work for a deliverable — a screenshot / photo, or a live link
 * (e.g. the published post) — added by the person doing the work when they
 * update its progress. Linked both to the task item it was added on and to
 * the contract deliverable that item came from, so every panel that shows
 * deliverables (user's tasks, admin/manager tasks, client page, sales
 * dashboard) can find it with its own ids.
 */
const DeliverableProofSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    taskItemId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Task.deliverables[]._id
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" },
    contractDeliverableId: { type: mongoose.Schema.Types.ObjectId }, // Contract.deliverables[]._id
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    deliverableTitle: { type: String, trim: true, maxlength: 300 }, // snapshot, for logs/exports
    // Which month the work was for ("YYYY-MM") on monthly deliverables, or
    // "all" for one-time ones — see utils/taskPeriods.js. Absent on proofs
    // added before monthly tracking (the panels then use the upload month).
    period: { type: String, trim: true, maxlength: 7 },

    kind: { type: String, enum: ["image", "link"], required: true },
    // kind "image": file in uploads/deliverable-proofs (random name)
    filename: { type: String },
    originalname: { type: String, trim: true, maxlength: 200 },
    mimetype: { type: String },
    size: { type: Number, min: 0 },
    // kind "link": the live URL (http/https only)
    url: { type: String, trim: true, maxlength: 2000 },

    note: { type: String, trim: true, maxlength: 300 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

DeliverableProofSchema.index({ taskId: 1, createdAt: -1 });
DeliverableProofSchema.index({ contractId: 1, createdAt: -1 });
DeliverableProofSchema.index({ clientId: 1, createdAt: -1 });

// Explicit collection name: this MongoDB database is shared with an unrelated
// system, so default names risk collisions (see Meeting.js / Contract.js).
module.exports = mongoose.model("DeliverableProof", DeliverableProofSchema, "deliverableProofs");
