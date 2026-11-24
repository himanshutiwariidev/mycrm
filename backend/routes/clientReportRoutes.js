const express = require("express");
const router = express.Router();

const { receiveReportFile, listReports, addReport, downloadReport, deleteReport, shareReport } = require("../controllers/clientReportController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// Monthly client reports per contract service (PDF / Word / Excel / CSV files
// or Google Sheet links). Super admin & sales manager (view only) & manager: any client; sales: own clients;
// user: assigned clients or clients they have tasks for — checked in the controller.
const reportAccess = requireRole("admin", "manager", "salesmanager", "sales", "user");

router.get("/", authMiddleware, reportAccess, listReports);
router.post("/", authMiddleware, reportAccess, receiveReportFile, addReport);
router.get("/:id/download", authMiddleware, reportAccess, downloadReport);
// Email a report to the client (anyone who can open the client's reports)
router.post("/:id/share", authMiddleware, reportAccess, shareReport);
router.delete("/:id", authMiddleware, reportAccess, deleteReport);

module.exports = router;
