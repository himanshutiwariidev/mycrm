const mongoose = require("mongoose");

const ProposalSchema = new mongoose.Schema(
  {
    proposalNumber: {
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
    projectAmount: {
      type: Number,
      required: [true, "Project amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    validUntil: {
      type: Date,
    },
    proposalStatus: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Proposal", ProposalSchema);
