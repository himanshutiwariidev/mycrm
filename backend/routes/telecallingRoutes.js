const express = require("express");
const router = express.Router();

const c = require("../controllers/telecallingController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

router.use(authMiddleware);

// 📞 Telecaller — own calling list, calls, stats, booked meetings
// (admin can read leads/calls too, for the Telecalling section drill-downs)
router.get("/leads", requireRole("telecaller", "admin"), c.listLeads);
router.post("/leads", requireRole("telecaller"), c.createLead);
router.put("/leads/:id", requireRole("telecaller", "admin"), c.updateLead);
router.post("/leads/:id/calls", requireRole("telecaller"), c.logCall);
router.get("/calls", requireRole("telecaller", "admin"), c.listCalls);
router.get("/stats", requireRole("telecaller"), c.myStats);
router.get("/meetings/booked", requireRole("telecaller"), c.bookedMeetings);
router.get("/sales-people", requireRole("telecaller", "admin"), c.salesPeople);

// 🤝 Sales — client meetings assigned to me, and their outcome
router.get("/meetings/assigned", requireRole("sales"), c.assignedMeetings);
router.put("/meetings/:id/status", requireRole("sales", "admin"), c.updateMeetingStatus);

// 🔐 Super admin — team performance + every client meeting
router.get("/admin/overview", requireRole("admin"), c.adminOverview);
router.get("/admin/meetings", requireRole("admin"), c.adminMeetings);

module.exports = router;
