const Expense = require("../models/Expense");

exports.createExpense = async (req, res) => {
  try {
    const { title, category, amount, expenseDate, paymentMethod, notes } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Title and amount are required" });
    }

    const expense = await Expense.create({
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      notes,
      createdBy: req.user.id,
    });
    await expense.populate("createdBy", "name email");

    return res.status(201).json({ message: "Expense recorded successfully", expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return res.status(500).json({ message: error.message || "Failed to record expense" });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate("createdBy", "name email").sort({ expenseDate: -1 });
    return res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch expenses" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { title, category, amount, expenseDate, paymentMethod, notes } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, category, amount, expenseDate, paymentMethod, notes },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.json({ message: "Expense updated successfully", expense });
  } catch (error) {
    console.error("Error updating expense:", error);
    return res.status(500).json({ message: error.message || "Failed to update expense" });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json({ message: error.message || "Failed to delete expense" });
  }
};
