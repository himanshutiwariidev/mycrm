const express = require("express");

const {
  getAttendance,
  getAttendanceByUser,
  getTodayAttendance,
  getAttendanceDashboard,
  exportAttendanceExcel,
} = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const router = express.Router();

router.get("/today", authMiddleware, requireRole("admin", "hr"), getTodayAttendance);
router.get("/dashboard", authMiddleware, requireRole("admin", "hr"), getAttendanceDashboard);
router.get("/export/excel", authMiddleware, requireRole("admin", "hr"), exportAttendanceExcel);
router.get("/", authMiddleware, requireRole("admin", "hr"), getAttendance);
router.get("/:userId", authMiddleware, getAttendanceByUser);

module.exports = router;
