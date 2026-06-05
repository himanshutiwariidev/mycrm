const express = require("express");

const {
  getAttendance,
  getAttendanceByUser,
  getTodayAttendance,
  exportAttendanceExcel,
} = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

const router = express.Router();

router.get("/today", authMiddleware, adminOnly, getTodayAttendance);
router.get("/export/excel", authMiddleware, adminOnly, exportAttendanceExcel);
router.get("/", authMiddleware, adminOnly, getAttendance);
router.get("/:userId", authMiddleware, getAttendanceByUser);

module.exports = router;
