const express = require("express");

const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
} = require("../controllers/leaveController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const router = express.Router();

router.post("/", authMiddleware, applyLeave);
router.get("/my", authMiddleware, getMyLeaves);
router.get("/", authMiddleware, requireRole("admin", "hr"), getAllLeaves);
router.put("/:id/status", authMiddleware, requireRole("admin", "hr"), updateLeaveStatus);

module.exports = router;
