const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const clientAccess = requireRole("admin", "sales");
// Read-only client list/detail/remarks/work-progress access also extends to "user"
// (an assigned non-sales user), who can only ever see clients assigned to them —
// enforced inside the controllers, not by this role gate alone.
const clientViewAccess = requireRole("admin", "sales", "user");
const workProgressViewAccess = requireRole("admin", "sales", "user", "client");

// Dashboard Stats (must come before "/:id")
router.get("/dashboard-stats", authMiddleware, clientAccess, clientController.getDashboardStats);

// Client Portal (role: "client") - must come before "/:id"
router.get("/my-project", authMiddleware, requireRole("client"), clientController.getMyProject);

// Client Routes (Protected)
router.post("/", authMiddleware, clientAccess, clientController.createClient);
router.get("/", authMiddleware, clientViewAccess, clientController.getAllClients);
router.get("/:id", authMiddleware, clientViewAccess, clientController.getClientById);
router.put("/:id", authMiddleware, clientAccess, clientController.updateClient);
router.delete("/:id", authMiddleware, clientAccess, clientController.deleteClient);
router.get("/:id/activity", authMiddleware, clientViewAccess, clientController.getClientActivity);
router.put("/:id/assign", authMiddleware, requireRole("admin"), clientController.assignUserToClient);
router.get("/:id/remarks", authMiddleware, clientViewAccess, clientController.getRemarks);
router.post("/:id/remarks", authMiddleware, clientViewAccess, clientController.addRemark);
router.get("/:id/work-progress", authMiddleware, workProgressViewAccess, clientController.getWorkProgress);
router.post("/:id/work-progress", authMiddleware, clientViewAccess, clientController.addWorkProgress);
router.put("/:id/work-progress/:entryId", authMiddleware, clientViewAccess, clientController.updateWorkProgress);
router.post("/:id/pi-attachments", authMiddleware, clientAccess, clientController.uploadPiAttachmentMiddleware, clientController.uploadPiAttachment);
router.delete("/:id/pi-attachments/:attachmentId", authMiddleware, clientAccess, clientController.deletePiAttachment);

// Contract Routes
router.post("/contracts/create", authMiddleware, clientAccess, clientController.createContract);
router.get("/contracts/all", authMiddleware, clientAccess, clientController.getAllContracts);
router.get("/contracts/:id", authMiddleware, clientAccess, clientController.getContractById);
router.get("/contracts/:id/invoice", authMiddleware, clientAccess, clientController.generateInvoice);
router.post("/contracts/:id/send", authMiddleware, clientAccess, clientController.sendContract);
router.put("/contracts/:id", authMiddleware, clientAccess, clientController.updateContract);
router.delete("/contracts/:id", authMiddleware, clientAccess, clientController.deleteContract);

// Contract Deliverables Routes
router.post("/contracts/:id/deliverables", authMiddleware, clientAccess, clientController.addDeliverable);
router.put("/contracts/:id/deliverables/:deliverableId", authMiddleware, clientAccess, clientController.updateDeliverable);
router.delete("/contracts/:id/deliverables/:deliverableId", authMiddleware, clientAccess, clientController.deleteDeliverable);

// Contract Payments Routes
router.post("/contracts/:id/payments", authMiddleware, clientAccess, clientController.addPayment);
router.delete("/contracts/:id/payments/:paymentId", authMiddleware, clientAccess, clientController.deletePayment);

// Contract PI (proforma invoice) Routes
router.post("/contracts/:id/pi", authMiddleware, clientAccess, clientController.uploadPiAttachmentMiddleware, clientController.uploadContractPi);
router.delete("/contracts/:id/pi", authMiddleware, clientAccess, clientController.deleteContractPi);

// Payment Reminder Routes
router.post("/reminders/create", authMiddleware, clientAccess, clientController.createPaymentReminder);
router.get("/reminders/all", authMiddleware, clientAccess, clientController.getAllReminders);
router.post("/reminders/:id/send", authMiddleware, clientAccess, clientController.sendPaymentReminder);
router.put("/reminders/:id", authMiddleware, clientAccess, clientController.updatePaymentReminder);
router.delete("/reminders/:id", authMiddleware, clientAccess, clientController.deletePaymentReminder);

module.exports = router;
