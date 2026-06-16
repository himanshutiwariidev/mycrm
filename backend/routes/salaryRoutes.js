const express = require("express");

const { paySalary, getMySalarySlips } = require("../controllers/salaryController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { requireRole } = require("../middleware/roleAccess");

const router = express.Router();

router.get("/my-slips", authMiddleware, getMySalarySlips);
router.post("/pay/:id", authMiddleware, requireRole("admin", "hr"), paySalary);

module.exports = router;
