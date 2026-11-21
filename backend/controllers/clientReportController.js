const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const Client = require("../models/Client");
const Contract = require("../models/Contract");
const Task = require("../models/Task");
const User = require("../models/User");
const ClientReport = require("../models/ClientReport");
const { logActivity } = require("../utils/activityLogger");
const { PERIOD_RE, latestAllowedMonth } = require("../utils/taskPeriods");
const { SERVICE_CATEGORY_LABELS } = require("../utils/pricingHelpers");

// Client reports are business documents, so they live OUTSIDE the public
// /uploads folder and are only ever served through the authenticated
// download route below.
const REPORT_DIR = path.join(__dirname, "../storage/client-reports");
const MAX_REPORT_BYTES = 20 * 1024 * 1024;

const FORMATS = {
  pdf: { mime: "application/pdf", check: (b) => b.toString("latin1", 0, 4) === "%PDF" },
  doc: { mime: "application/msword", check: (b) => isOle(b) },
  xls: { mime: "application/vnd.ms-excel", check: (b) => isOle(b) },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", check: (b) => isZip(b) },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", check: (b) => isZip(b) },
  csv: { mime: "text/csv", check: (b) => !b.includes(0) }, // plain text: no NUL bytes
};
const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const isOle = (b) => b.slice(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
const formatOf = (name) => path.extname(String(name || "")).slice(1).toLowerCase();

const MONTH_NAME = (period) => new Date(`${period}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => fs.mkdir(REPORT_DIR, { recursive: true }, (err) => cb(err, REPORT_DIR)),
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}.${formatOf(file.originalname)}`),
  }),
  limits: { fileSize: MAX_REPORT_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (FORMATS[formatOf(file.originalname)]) return cb(null, true);
    const err = new Error("Upload a PDF, Word (.doc/.docx), Excel (.xls/.xlsx) or CSV file");
    err.status = 400;
    return cb(err);
  },
}).single("file");

/** Multer for the optional report `file`, with its errors turned into 400 JSON. */
exports.receiveReportFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    const message = err.code === "LIMIT_FILE_SIZE" ? `Reports must be under ${MAX_REPORT_BYTES / (1024 * 1024)} MB` : err.message || "Upload failed";
    return res.status(err.status || 400).json({ message });
  });
};

/**
 * Who can see and add a client's monthly reports: admin and manager (any
 * client), the client's sales person, and a user assigned to the client or to
 * one of its tasks.
 */
async function canAccessClient(user, clientId) {
  if (!mongoose.isValidObjectId(clientId)) return false;
  if (user.role === "admin" || user.role === "manager") return Client.exists({ _id: clientId }).then(Boolean);
  const client = await Client.findById(clientId).select("salesPerson assignedUser").lean();
  if (!client) return false;
  if (user.role === "sales") return String(client.salesPerson || "") === String(user.id);
  if (user.role === "user") {
    return String(client.assignedUser || "") === String(user.id) || Boolean(await Task.exists({ clientId, assignedTo: user.id }));
  }
  return false;
}

/** Each contract's services (from its deliverables) with the dates the months are worked out from. */
async function servicesOf(clientId) {
  const contracts = await Contract.find({ clientId })
    .select("projectName contractNumber deliverables.categoryId selectedServices contractStartDate validUntil timeline createdAt")
    .sort({ createdAt: 1 })
    .lean();
  return contracts.flatMap((c) => {
    const ids = new Set((c.deliverables || []).map((d) => d.categoryId).filter(Boolean));
    if (!ids.size) (c.selectedServices || []).filter((s) => s.enabled && s.categoryId).forEach((s) => ids.add(s.categoryId));
    return [...ids].map((categoryId) => ({
      contractId: c._id,
      projectName: c.projectName,
      contractNumber: c.contractNumber,
      categoryId,
      contractStartDate: c.contractStartDate,
      validUntil: c.validUntil,
      timeline: c.timeline,
      createdAt: c.createdAt,
    }));
  });
}

const POPULATE_UPLOADER = { path: "uploadedBy", select: "name role" };

/** GET /api/client-reports?clientId= — the client's services and all their monthly reports. */
exports.listReports = async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!(await canAccessClient(req.user, clientId))) return res.status(403).json({ message: "You don't have access to this client's reports" });
    const [services, reports] = await Promise.all([
      servicesOf(clientId),
      ClientReport.find({ clientId }).sort({ createdAt: -1 }).populate(POPULATE_UPLOADER).lean(),
    ]);
    return res.json({ services, reports });
  } catch (error) {
    console.error("Error listing client reports:", error);
    return res.status(500).json({ message: error.message || "Failed to load reports" });
  }
};

/**
 * POST /api/client-reports — multipart: clientId, contractId, categoryId,
 * period ("YYYY-MM"), and either `file` (PDF/Word/Excel/CSV) or `link`, plus an
 * optional `note`.
 */
exports.addReport = async (req, res) => {
  const file = req.file;
  const reject = (status, message) => {
    if (file?.path) fs.promises.unlink(file.path).catch(() => {});
    return res.status(status).json({ message });
  };
  try {
    const { clientId, contractId, categoryId } = req.body;
    const period = String(req.body.period || "");
    if (req.user.role === "admin") return reject(403, "Super admin can view reports but not add them");
    if (!(await canAccessClient(req.user, clientId))) return reject(403, "You don't have access to this client's reports");
    if (!PERIOD_RE.test(period)) return reject(400, "Choose the report month");
    if (period > latestAllowedMonth()) return reject(400, "Reports can't be added for a future month");
    if (!mongoose.isValidObjectId(contractId)) return reject(400, "Choose the contract");
    const service = (await servicesOf(clientId)).find((s) => String(s.contractId) === String(contractId) && s.categoryId === categoryId);
    if (!service) return reject(400, "That service isn't part of this client's contract");

    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 300) : "";
    const doc = { clientId, contractId, categoryId, period, uploadedBy: req.user.id, ...(note ? { note } : {}) };

    if (file) {
      const format = formatOf(file.originalname);
      const head = Buffer.alloc(4096);
      const handle = await fs.promises.open(file.path, "r");
      let read;
      try { ({ bytesRead: read } = await handle.read(head, 0, 4096, 0)); } finally { await handle.close(); }
      if (!read || !FORMATS[format].check(head.subarray(0, read))) return reject(400, `"${file.originalname}" isn't a valid ${format.toUpperCase()} file`);
      Object.assign(doc, { kind: "file", filename: file.filename, originalname: String(file.originalname).slice(0, 200), format, size: file.size });
    } else {
      let url = String(req.body.link || "").trim();
      if (!url) return reject(400, "Upload a report file or paste a Google Sheet link");
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
      let parsed;
      try { parsed = new URL(url); } catch { parsed = null; }
      if (!parsed || !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) return reject(400, "Enter a valid link, e.g. https://docs.google.com/spreadsheets/…");
      Object.assign(doc, { kind: "link", url: parsed.toString().slice(0, 2000) });
    }

    const report = await ClientReport.create(doc);
    await report.populate(POPULATE_UPLOADER);

    const actor = await User.findById(req.user.id).select("name").lean().catch(() => null);
    const label = SERVICE_CATEGORY_LABELS[categoryId] || categoryId;
    const what = report.kind === "file" ? report.format.toUpperCase() : /docs\.google\.com\/spreadsheets/.test(report.url) ? "Google Sheet" : "link";
    await logActivity(clientId, "client_report_added", `${actor?.name || "A team member"} added the ${label} report for ${MONTH_NAME(period)} (${what})`, {
      reportId: report._id, contractId,
    });

    return res.status(201).json({ message: "Report added", report });
  } catch (error) {
    if (file?.path) fs.promises.unlink(file.path).catch(() => {});
    console.error("Error adding client report:", error);
    return res.status(500).json({ message: error.message || "Failed to add report" });
  }
};

/** GET /api/client-reports/:id/download — the report file, for people with access to the client. */
exports.downloadReport = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Report not found" });
    const report = await ClientReport.findById(req.params.id).lean();
    if (!report || report.kind !== "file") return res.status(404).json({ message: "Report not found" });
    if (!(await canAccessClient(req.user, report.clientId))) return res.status(403).json({ message: "You don't have access to this client's reports" });
    const filePath = path.join(REPORT_DIR, path.basename(report.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "The report file is missing" });
    res.setHeader("Content-Type", FORMATS[report.format]?.mime || "application/octet-stream");
    return res.download(filePath, report.originalname || `report.${report.format}`);
  } catch (error) {
    console.error("Error downloading client report:", error);
    return res.status(500).json({ message: error.message || "Failed to download report" });
  }
};

/** DELETE /api/client-reports/:id — the person who added it, or a manager (super admin only views). */
exports.deleteReport = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Report not found" });
    const report = await ClientReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    if (req.user.role === "admin") return res.status(403).json({ message: "Super admin can view reports but not remove them" });
    if (req.user.role !== "manager" && String(report.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only remove reports you added" });
    }
    await report.deleteOne();
    if (report.kind === "file" && report.filename) fs.promises.unlink(path.join(REPORT_DIR, path.basename(report.filename))).catch(() => {});
    return res.json({ message: "Report removed" });
  } catch (error) {
    console.error("Error removing client report:", error);
    return res.status(500).json({ message: error.message || "Failed to remove report" });
  }
};
