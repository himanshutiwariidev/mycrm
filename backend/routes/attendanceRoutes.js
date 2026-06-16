const express = require("express");

const {
  getAttendance,
  getAttendanceByUser,
  getTodayAttendance,
  exportAttendanceExcel,
} = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const router = express.Router();

router.get("/today", authMiddleware, requireRole("admin", "hr"), getTodayAttendance);
router.get("/export/excel", authMiddleware, requireRole("admin", "hr"), exportAttendanceExcel);
router.get("/", authMiddleware, requireRole("admin", "hr"), getAttendance);
router.get("/:userId", authMiddleware, getAttendanceByUser);

module.exports = router;
