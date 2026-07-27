const mongoose = require("mongoose");

const PaymentReminderSchema = new mongoose.Schema(
  {
    reminderId: {
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
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    amountDue: {
      type: Number,
      required: [true, "Amount due is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    dueDate: {
      type: Date,
    },
    reminderType: {
      type: String,
      enum: ["first-reminder", "second-reminder", "final-reminder", "custom"],
      default: "first-reminder",
    },
    sentAt: {
      type: Date,
    },
    sentTo: {
      type: String,
      trim: true,
    },
    reminderStatus: {
      type: String,
      enum: ["drafted", "sent", "received", "paid"],
      default: "drafted",
    },
    customMessage: {
      type: String,
      trim: true,
    },
    reminderCount: {
      type: Number,
      default: 1,
    },
    nextReminderDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentReminder", PaymentReminderSchema);
