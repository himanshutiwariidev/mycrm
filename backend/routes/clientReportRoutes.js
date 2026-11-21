const express = require("express");
const router = express.Router();

const { receiveReportFile, listReports, addReport, downloadReport, deleteReport } = require("../controllers/clientReportController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// Monthly client reports per contract service (PDF / Word / Excel / CSV files
// or Google Sheet links). Super admin (view only) & manager: any client; sales: own clients;
// user: assigned clients or clients they have tasks for — checked in the controller.
const reportAccess = requireRole("admin", "manager", "sales", "user");

router.get("/", authMiddleware, reportAccess, listReports);
router.post("/", authMiddleware, reportAccess, receiveReportFile, addReport);
router.get("/:id/download", authMiddleware, reportAccess, downloadReport);
router.delete("/:id", authMiddleware, reportAccess, deleteReport);

module.exports = router;
