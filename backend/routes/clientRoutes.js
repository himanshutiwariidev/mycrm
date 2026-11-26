const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const salesDashboardController = require("../controllers/salesDashboardController");
// Row-level guards: a sales person (or assigned user) may only touch clients
// they own — admin passes straight through. See middleware/clientOwnership.js.
const { ownClient, ownClientInBody, ownClientsInBody, ownContract, ownReminder, salesManagerClient } = require("../middleware/clientOwnership");

// "salesmanager" works across the whole sales team, like admin (ownership
// guards below only narrow sales/user) — see middleware/clientOwnership.js.
const clientAccess = requireRole("admin", "salesmanager", "sales");
// Read-only client list/detail/remarks/work-progress access also extends to "user"
// (an assigned non-sales user), who can only ever see clients assigned to them —
// enforced inside the controllers, not by this role gate alone.
const clientViewAccess = requireRole("admin", "salesmanager", "sales", "user");
const workProgressViewAccess = requireRole("admin", "salesmanager", "sales", "user", "client");

// Dashboard Stats (must come before "/:id"). Company-wide figures — admin
// only; a sales person gets their own scoped view from /sales-dashboard.
router.get("/dashboard-stats", authMiddleware, requireRole("admin"), clientController.getDashboardStats);
router.get("/monthly-payments", authMiddleware, requireRole("admin"), clientController.getMonthlyClientPayments);
router.get("/activity/all", authMiddleware, requireRole("admin"), clientController.getAllActivity);
// Sales person: their own book. Sales manager / admin: ?salesPerson=<id>, or the whole team.
router.get("/sales-dashboard", authMiddleware, requireRole("sales", "salesmanager", "admin"), salesDashboardController.getSalesDashboard);
router.get("/sales-team", authMiddleware, requireRole("salesmanager", "admin"), salesDashboardController.getSalesTeam);

// Client Portal (role: "client") - must come before "/:id"
router.get("/my-project", authMiddleware, requireRole("client"), clientController.getMyProject);

// Client Routes (Protected)
router.post("/", authMiddleware, clientAccess, clientController.createClient);
router.get("/", authMiddleware, clientViewAccess, clientController.getAllClients);
router.post("/import", authMiddleware, clientAccess, clientController.importClientsMiddleware, clientController.importClients);
// Must come before "/:id" below — otherwise Express would match this DELETE
// as "/:id" with id="bulk-delete".
router.delete("/bulk-delete", authMiddleware, clientAccess, ownClientsInBody, clientController.bulkDeleteClients);
router.get("/:id", authMiddleware, clientViewAccess, salesManagerClient, clientController.getClientById);
router.put("/:id", authMiddleware, clientAccess, ownClient, clientController.updateClient);
router.delete("/:id", authMiddleware, clientAccess, ownClient, clientController.deleteClient);
// Activity timeline: super admin only (shown on the super admin dashboard).
router.get("/:id/activity", authMiddleware, requireRole("admin"), clientController.getClientActivity);
router.put("/:id/assign", authMiddleware, requireRole("admin"), clientController.assignUserToClient);
router.get("/:id/remarks", authMiddleware, clientViewAccess, salesManagerClient, clientController.getRemarks);
router.post("/:id/remarks", authMiddleware, clientViewAccess, salesManagerClient, clientController.addRemark);
router.get("/:id/work-progress", authMiddleware, workProgressViewAccess, salesManagerClient, clientController.getWorkProgress);
router.post("/:id/work-progress", authMiddleware, clientViewAccess, salesManagerClient, clientController.addWorkProgress);
router.put("/:id/work-progress/:entryId", authMiddleware, clientViewAccess, salesManagerClient, clientController.updateWorkProgress);
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

// Email the client that a contract is up for renewal
router.post("/contracts/:id/renewal-reminder", authMiddleware, clientAccess, ownContract, clientController.sendRenewalReminder);

// Bad debt: write off what a client won't pay (super admin / sales manager only)
router.post("/contracts/:id/bad-debt", authMiddleware, requireRole("admin", "salesmanager"), ownContract, clientController.writeOffBadDebt);
router.delete("/contracts/:id/bad-debt", authMiddleware, requireRole("admin", "salesmanager"), ownContract, clientController.undoBadDebt);

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
