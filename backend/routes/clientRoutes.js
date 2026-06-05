const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// Client Routes (Protected)
router.post("/", authMiddleware, adminOnly, clientController.createClient);
router.get("/", authMiddleware, adminOnly, clientController.getAllClients);
router.get("/:id", authMiddleware, adminOnly, clientController.getClientById);
router.put("/:id", authMiddleware, adminOnly, clientController.updateClient);
router.delete("/:id", authMiddleware, adminOnly, clientController.deleteClient);

// Proposal Routes
router.post("/proposals/create", authMiddleware, adminOnly, clientController.createProposal);
router.get("/proposals/all", authMiddleware, adminOnly, clientController.getAllProposals);
router.get("/proposals/:id", authMiddleware, adminOnly, clientController.getProposalById);
router.post("/proposals/:id/send", authMiddleware, adminOnly, clientController.sendProposal);
router.put("/proposals/:id", authMiddleware, adminOnly, clientController.updateProposal);
router.delete("/proposals/:id", authMiddleware, adminOnly, clientController.deleteProposal);

// Payment Reminder Routes
router.post("/reminders/create", authMiddleware, adminOnly, clientController.createPaymentReminder);
router.get("/reminders/all", authMiddleware, adminOnly, clientController.getAllReminders);
router.post("/reminders/:id/send", authMiddleware, adminOnly, clientController.sendPaymentReminder);
router.put("/reminders/:id", authMiddleware, adminOnly, clientController.updatePaymentReminder);
router.delete("/reminders/:id", authMiddleware, adminOnly, clientController.deletePaymentReminder);

module.exports = router;
