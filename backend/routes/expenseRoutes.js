const express = require("express");
const router = express.Router();

const {
  createExpense, getExpenses, updateExpense, deleteExpense,
} = require("../controllers/expenseController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

router.post("/", authMiddleware, adminOnly, createExpense);
router.get("/", authMiddleware, adminOnly, getExpenses);
router.put("/:id", authMiddleware, adminOnly, updateExpense);
router.delete("/:id", authMiddleware, adminOnly, deleteExpense);

module.exports = router;
