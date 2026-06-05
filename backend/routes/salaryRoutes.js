const express = require("express");

const { paySalary, getMySalarySlips } = require("../controllers/salaryController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

const router = express.Router();

router.get("/my-slips", authMiddleware, getMySalarySlips);
router.post("/pay/:id", authMiddleware, adminOnly, paySalary);

module.exports = router;
