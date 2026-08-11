const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Salary", "Rent", "Utilities", "Marketing", "Software & Tools", "Office Supplies", "Travel", "Professional Fees", "Other"],
      default: "Other",
    },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, default: Date.now },
    // Same canonical set as Contract.payments.method, for consistency across the app.
    paymentMethod: {
      type: String,
      enum: ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "Other"],
      default: "Cash",
    },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Dashboard stats filters/sums expenses within a date range keyed off expenseDate.
ExpenseSchema.index({ expenseDate: 1 });
ExpenseSchema.index({ category: 1 });

// Explicit collection name: the default "expenses" collides with an unrelated
// tenant-aware payroll/expense system sharing this MongoDB database (same
// reason Contract.js uses "clientContracts" instead of the default "contracts").
module.exports = mongoose.model("Expense", ExpenseSchema, "clientExpenses");
