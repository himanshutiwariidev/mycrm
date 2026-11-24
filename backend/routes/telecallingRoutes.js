const express = require("express");
const router = express.Router();

const c = require("../controllers/telecallingController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

router.use(authMiddleware);

// 📞 Telecaller — own calling list, calls, stats, booked meetings
// (admin and the sales manager can read every telecaller's leads/calls, for the
// Telecalling section — read-only for the sales manager)
router.get("/leads", requireRole("telecaller", "admin", "salesmanager"), c.listLeads);
router.post("/leads", requireRole("telecaller"), c.createLead);
router.put("/leads/:id", requireRole("telecaller", "admin"), c.updateLead);
router.post("/leads/:id/calls", requireRole("telecaller"), c.logCall);
router.get("/calls", requireRole("telecaller", "admin", "salesmanager"), c.listCalls);
router.get("/stats", requireRole("telecaller"), c.myStats);
router.get("/meetings/booked", requireRole("telecaller"), c.bookedMeetings);
router.get("/sales-people", requireRole("salesmanager", "admin"), c.salesPeople);

// 🤝 Sales — client meetings assigned to me, and their outcome
router.get("/meetings/assigned", requireRole("sales", "salesmanager"), c.assignedMeetings);
// …and meetings they add themselves (e.g. found on the spot)
router.post("/meetings", requireRole("sales", "salesmanager"), c.createOwnMeeting);
router.put("/meetings/:id/status", requireRole("sales", "salesmanager", "admin"), c.updateMeetingStatus);

// 🧭 Sales manager — every client meeting; gives booked meetings to a sales person
// (telecallers book them unassigned)
router.put("/meetings/:id/assign", requireRole("salesmanager", "admin"), c.assignMeeting);

// 🔐 Super admin / sales manager — telecaller team performance + every client meeting
router.get("/admin/overview", requireRole("admin", "salesmanager"), c.adminOverview);
router.get("/admin/meetings", requireRole("admin", "salesmanager"), c.adminMeetings);

module.exports = router;
