const express = require("express");
const router = express.Router();

const { checkIn, checkOut, getMyVisits, getAllVisits, addPhotos, deletePhoto } = require("../controllers/clientVisitController");
const { receivePhotos } = require("../utils/visitPhotos");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
// A sales person can only check in at one of their own clients.
const { ownClientInBody } = require("../middleware/clientOwnership");

// 👤 Sales person — share location when attending a client meeting
// (the sales manager can go to client meetings too)
router.post("/check-in", authMiddleware, requireRole("sales", "salesmanager"), ownClientInBody, checkIn);
router.put("/:id/check-out", authMiddleware, requireRole("sales", "salesmanager"), checkOut);
router.get("/mine", authMiddleware, requireRole("sales", "salesmanager"), getMyVisits);
// Photos from the meeting (with the client, visiting card, office / factory …).
// Ownership + the edit window are checked in the controller.
router.post("/:id/photos", authMiddleware, requireRole("sales", "salesmanager"), receivePhotos, addPhotos);
router.delete("/:id/photos/:photoId", authMiddleware, requireRole("sales", "salesmanager"), deletePhoto);

// 🔐 Super admin / sales manager — every sales person's visit records
router.get("/", authMiddleware, requireRole("admin", "salesmanager"), getAllVisits);

module.exports = router;
