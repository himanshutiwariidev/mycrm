const express = require("express");
const router = express.Router();

const { checkIn, checkOut, getMyVisits, getAllVisits, addPhotos, deletePhoto } = require("../controllers/clientVisitController");
const { receivePhotos } = require("../utils/visitPhotos");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
// A sales person can only check in at one of their own clients.
const { ownClientInBody } = require("../middleware/clientOwnership");

// 👤 Sales person — share location when attending a client meeting
router.post("/check-in", authMiddleware, requireRole("sales"), ownClientInBody, checkIn);
router.put("/:id/check-out", authMiddleware, requireRole("sales"), checkOut);
router.get("/mine", authMiddleware, requireRole("sales"), getMyVisits);
// Photos from the meeting (with the client, visiting card, office / factory …).
// Ownership + the edit window are checked in the controller.
router.post("/:id/photos", authMiddleware, requireRole("sales"), receivePhotos, addPhotos);
router.delete("/:id/photos/:photoId", authMiddleware, requireRole("sales"), deletePhoto);

// 🔐 Super admin — every sales person's visit records
router.get("/", authMiddleware, requireRole("admin"), getAllVisits);

module.exports = router;
