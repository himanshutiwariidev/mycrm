const express = require("express");
const router = express.Router();

const { receiveProofImages, addProofs, listProofs, deleteProof } = require("../controllers/deliverableProofController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// Proof of work (screenshots / live links) on deliverables. Per-record access
// (own task, own clients, uploader) is checked in the controller.
router.get("/", authMiddleware, requireRole("admin", "manager", "sales", "user"), listProofs);
router.post("/tasks/:taskId/items/:itemId", authMiddleware, requireRole("admin", "manager", "user"), receiveProofImages, addProofs);
router.delete("/:id", authMiddleware, requireRole("admin", "manager", "user"), deleteProof);

module.exports = router;
