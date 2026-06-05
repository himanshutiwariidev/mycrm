const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slipNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    salaryMonth: {
      type: String,
      required: true,
      trim: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    homeAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    travelAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    otherAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaves: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    pf: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    inHand: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    emailedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalarySlip", salarySchema);
