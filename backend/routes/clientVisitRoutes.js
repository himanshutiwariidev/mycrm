const express = require("express");
const router = express.Router();

const { checkIn, checkOut, getMyVisits, getAllVisits } = require("../controllers/clientVisitController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
// A sales person can only check in at one of their own clients.
const { ownClientInBody } = require("../middleware/clientOwnership");

// 👤 Sales person — share location when attending a client meeting
router.post("/check-in", authMiddleware, requireRole("sales"), ownClientInBody, checkIn);
router.put("/:id/check-out", authMiddleware, requireRole("sales"), checkOut);
router.get("/mine", authMiddleware, requireRole("sales"), getMyVisits);

// 🔐 Super admin — every sales person's visit records
router.get("/", authMiddleware, requireRole("admin"), getAllVisits);

module.exports = router;
