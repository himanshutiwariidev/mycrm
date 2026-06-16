const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const clientAccess = requireRole("admin", "sales");

// Client Routes (Protected)
router.post("/", authMiddleware, clientAccess, clientController.createClient);
router.get("/", authMiddleware, clientAccess, clientController.getAllClients);
router.get("/:id", authMiddleware, clientAccess, clientController.getClientById);
router.put("/:id", authMiddleware, clientAccess, clientController.updateClient);
router.delete("/:id", authMiddleware, clientAccess, clientController.deleteClient);

// Proposal Routes
router.post("/proposals/create", authMiddleware, clientAccess, clientController.createProposal);
router.get("/proposals/all", authMiddleware, clientAccess, clientController.getAllProposals);
router.get("/proposals/:id", authMiddleware, clientAccess, clientController.getProposalById);
router.post("/proposals/:id/send", authMiddleware, clientAccess, clientController.sendProposal);
router.put("/proposals/:id", authMiddleware, clientAccess, clientController.updateProposal);
router.delete("/proposals/:id", authMiddleware, clientAccess, clientController.deleteProposal);

// Payment Reminder Routes
router.post("/reminders/create", authMiddleware, clientAccess, clientController.createPaymentReminder);
router.get("/reminders/all", authMiddleware, clientAccess, clientController.getAllReminders);
router.post("/reminders/:id/send", authMiddleware, clientAccess, clientController.sendPaymentReminder);
router.put("/reminders/:id", authMiddleware, clientAccess, clientController.updatePaymentReminder);
router.delete("/reminders/:id", authMiddleware, clientAccess, clientController.deletePaymentReminder);

module.exports = router;
