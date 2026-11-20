const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const salesDashboardController = require("../controllers/salesDashboardController");
// Row-level guards: a sales person (or assigned user) may only touch clients
// they own — admin passes straight through. See middleware/clientOwnership.js.
const { ownClient, ownClientInBody, ownClientsInBody, ownContract, ownReminder } = require("../middleware/clientOwnership");

const clientAccess = requireRole("admin", "sales");
// Read-only client list/detail/remarks/work-progress access also extends to "user"
// (an assigned non-sales user), who can only ever see clients assigned to them —
// enforced inside the controllers, not by this role gate alone.
const clientViewAccess = requireRole("admin", "sales", "user");
const workProgressViewAccess = requireRole("admin", "sales", "user", "client");

// Dashboard Stats (must come before "/:id"). Company-wide figures — admin
// only; a sales person gets their own scoped view from /sales-dashboard.
router.get("/dashboard-stats", authMiddleware, requireRole("admin"), clientController.getDashboardStats);
router.get("/activity/all", authMiddleware, requireRole("admin"), clientController.getAllActivity);
router.get("/sales-dashboard", authMiddleware, requireRole("sales"), salesDashboardController.getSalesDashboard);

// Client Portal (role: "client") - must come before "/:id"
router.get("/my-project", authMiddleware, requireRole("client"), clientController.getMyProject);

// Client Routes (Protected)
router.post("/", authMiddleware, clientAccess, clientController.createClient);
router.get("/", authMiddleware, clientViewAccess, clientController.getAllClients);
router.post("/import", authMiddleware, clientAccess, clientController.importClientsMiddleware, clientController.importClients);
// Must come before "/:id" below — otherwise Express would match this DELETE
// as "/:id" with id="bulk-delete".
router.delete("/bulk-delete", authMiddleware, clientAccess, ownClientsInBody, clientController.bulkDeleteClients);
router.get("/:id", authMiddleware, clientViewAccess, clientController.getClientById);
router.put("/:id", authMiddleware, clientAccess, ownClient, clientController.updateClient);
router.delete("/:id", authMiddleware, clientAccess, ownClient, clientController.deleteClient);
router.get("/:id/activity", authMiddleware, clientViewAccess, ownClient, clientController.getClientActivity);
router.put("/:id/assign", authMiddleware, requireRole("admin"), clientController.assignUserToClient);
router.get("/:id/remarks", authMiddleware, clientViewAccess, clientController.getRemarks);
router.post("/:id/remarks", authMiddleware, clientViewAccess, clientController.addRemark);
router.get("/:id/work-progress", authMiddleware, workProgressViewAccess, clientController.getWorkProgress);
router.post("/:id/work-progress", authMiddleware, clientViewAccess, clientController.addWorkProgress);
router.put("/:id/work-progress/:entryId", authMiddleware, clientViewAccess, clientController.updateWorkProgress);
router.post("/:id/pi-attachments", authMiddleware, clientAccess, ownClient, clientController.uploadPiAttachmentMiddleware, clientController.uploadPiAttachment);
router.delete("/:id/pi-attachments/:attachmentId", authMiddleware, clientAccess, ownClient, clientController.deletePiAttachment);

// Contract Routes
router.post("/contracts/create", authMiddleware, clientAccess, ownClientInBody, clientController.createContract);
router.get("/contracts/all", authMiddleware, clientAccess, clientController.getAllContracts);
router.get("/contracts/:id", authMiddleware, clientAccess, ownContract, clientController.getContractById);
router.get("/contracts/:id/invoice", authMiddleware, clientAccess, ownContract, clientController.generateInvoice);
router.post("/contracts/:id/send", authMiddleware, clientAccess, ownContract, clientController.sendContract);
router.put("/contracts/:id", authMiddleware, clientAccess, ownContract, clientController.updateContract);
router.delete("/contracts/:id", authMiddleware, clientAccess, ownContract, clientController.deleteContract);

// Contract Deliverables Routes
router.post("/contracts/:id/deliverables", authMiddleware, clientAccess, ownContract, clientController.addDeliverable);
router.put("/contracts/:id/deliverables/:deliverableId", authMiddleware, clientAccess, ownContract, clientController.updateDeliverable);
router.delete("/contracts/:id/deliverables/:deliverableId", authMiddleware, clientAccess, ownContract, clientController.deleteDeliverable);

// Contract Payments Routes
router.post("/contracts/:id/payments", authMiddleware, clientAccess, ownContract, clientController.addPayment);
router.delete("/contracts/:id/payments/:paymentId", authMiddleware, clientAccess, ownContract, clientController.deletePayment);

// Contract PI (proforma invoice) Routes
router.post("/contracts/:id/pi", authMiddleware, clientAccess, ownContract, clientController.uploadPiAttachmentMiddleware, clientController.uploadContractPi);
router.delete("/contracts/:id/pi", authMiddleware, clientAccess, ownContract, clientController.deleteContractPi);

// Payment Reminder Routes
router.post("/reminders/create", authMiddleware, clientAccess, ownClientInBody, clientController.createPaymentReminder);
router.get("/reminders/all", authMiddleware, clientAccess, clientController.getAllReminders);
router.post("/reminders/:id/send", authMiddleware, clientAccess, ownReminder, clientController.sendPaymentReminder);
router.put("/reminders/:id", authMiddleware, clientAccess, ownReminder, clientController.updatePaymentReminder);
router.delete("/reminders/:id", authMiddleware, clientAccess, ownReminder, clientController.deletePaymentReminder);

module.exports = router;
