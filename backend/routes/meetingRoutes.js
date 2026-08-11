const express = require("express");
const router = express.Router();

const {
  createMeeting, getMeetings, updateMeeting, deleteMeeting,
} = require("../controllers/meetingController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

router.post("/", authMiddleware, adminOnly, createMeeting);
router.get("/", authMiddleware, adminOnly, getMeetings);
router.put("/:id", authMiddleware, adminOnly, updateMeeting);
router.delete("/:id", authMiddleware, adminOnly, deleteMeeting);

module.exports = router;
