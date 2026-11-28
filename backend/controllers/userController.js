const User = require("../models/User");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const asyncHandler = require("../utils/asyncHandler");
const { createImageUpload, removeFiles } = require("../utils/imageUploads");
const { createLoginAttendance, logoutAttendance } = require("../services/attendanceService");

const userPhotoUpload = createImageUpload({
  dir: path.join(__dirname, "../uploads/user-photos"),
  field: "photo",
  maxFiles: 1,
  noun: "photo",
});

const USER_DOCS_DIR = path.join(__dirname, "../uploads/user-docs");
const DOC_EXT = /\.(pdf|jpe?g|png|webp|gif|doc|docx|txt)$/i;

const userDocsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(USER_DOCS_DIR, { recursive: true }, (err) => cb(err, USER_DOCS_DIR));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = DOC_EXT.test(ext) ? ext : "";
      cb(null, `${crypto.randomBytes(16).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (DOC_EXT.test(file.originalname || "") || /^image\/|^application\/pdf$/.test(file.mimetype || "")) {
      return cb(null, true);
    }
    const err = new Error("Only PDF, image, or document files (DOC/DOCX/TXT) are allowed");
    err.status = 400;
    return cb(err);
  },
}).fields([
  { name: "aadharDoc", maxCount: 1 },
  { name: "panDoc", maxCount: 1 },
  { name: "otherDocs", maxCount: 10 },
]);

function removeUserDocFile(filename) {
  if (!filename || filename.includes("/") || filename.includes("\\")) return;
  fs.promises.unlink(path.join(USER_DOCS_DIR, filename)).catch(() => {});
}

const PROFILE_FIELDS = [
  "empCode",
  "phone",
  "bloodGroup",
  "emergencyContact",
  "address",
  "pan",
  "aadhar",
  "bankAccount",
  "doj",
  "salary",
  "designation",
  "department",
  "remarks",
];

function pickProfileFields(body = {}) {
  const out = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === "salary") {
      out.salary = body.salary === "" || body.salary === null ? undefined : Number(body.salary);
    } else if (key === "doj") {
      out.doj = body.doj ? new Date(body.doj) : undefined;
    } else if (key === "pan") {
      out.pan = typeof body.pan === "string" ? body.pan.trim().toUpperCase() : body.pan;
    } else {
      out[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
    }
  }
  return out;
}

// ── Cookie options ──────────────────────────────────────────────────────────
// httpOnly prevents JS access; secure restricts to HTTPS in production;
// sameSite:"strict" blocks cross-site request forgery.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 day — matches JWT expiry
};

// ── bcrypt cost factor ──────────────────────────────────────────────────────
// 12 rounds is the current OWASP recommendation (up from the previous 10).
// bcrypt.compare() reads the rounds from the stored hash, so existing
// passwords verified at 10 rounds continue to work without migration.
const BCRYPT_ROUNDS = 12;

// Roles only an admin may hand out.
const ADMIN_GRANTED_ROLES = ["manager", "salesmanager"];

// ── CREATE USER (admin / HR / manager) ──────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  // A manager's Users section is scoped to onboarding plain team members —
  // never sales/hr/admin/another manager, regardless of what the request
  // body asks for.
  let resolvedRole = role;
  if (req.user.role === "manager") {
    resolvedRole = "user";
  } else if (ADMIN_GRANTED_ROLES.includes(role) && req.user.role !== "admin") {
    // Only an admin can grant the manager / sales manager roles (e.g. HR cannot).
    return res.status(403).json({ message: "Only an admin can create a manager or sales manager account" });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const profileFields = pickProfileFields(req.body);

  const created = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: resolvedRole,
    ...profileFields,
  });

  const safeUser = created.toObject();
  delete safeUser.password;

  return res.status(201).json({ message: "User created successfully", user: safeUser });
});

// ── GET ALL USERS ───────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  return res.json(users);
});

// ── GET USERS BY ROLE ───────────────────────────────────────────────────────
// Used by the Client Onboarding form's "Sales Person" dropdown (role=sales),
// among other admin lookups. Non-admin callers (e.g. a sales-role user
// onboarding their own client) may only look up the "sales" list — this
// keeps the dropdown working for them without letting this generic endpoint
// be used to enumerate admins/HR/other staff.
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;

  if (req.user.role !== "admin" && role !== "sales") {
    return res.status(403).json({ message: "Access denied" });
  }

  const users = await User.find({ role, isActive: true }).select("-password");
  return res.json(users);
});

// ── DELETE USER ─────────────────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role === "manager") {
    const target = await User.findById(req.params.id).select("role");
    if (!target || target.role !== "user") {
      return res.status(403).json({ message: "Managers can only manage accounts with the 'user' role" });
    }
  }

  const deleted = await User.findByIdAndDelete(req.params.id);
  if (deleted?.photo) userPhotoUpload.removeFile(deleted.photo);
  if (deleted?.aadharDoc?.filename) removeUserDocFile(deleted.aadharDoc.filename);
  if (deleted?.panDoc?.filename) removeUserDocFile(deleted.panDoc.filename);
  (deleted?.otherDocs || []).forEach((d) => removeUserDocFile(d.filename));
  return res.json({ message: "User deleted successfully" });
});

// ── UPDATE USER ─────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const updatePayload = { ...req.body };
  delete updatePayload.photo; // handled by POST /:id/photo

  if (req.user.role === "manager") {
    const target = await User.findById(req.params.id).select("role");
    if (!target || target.role !== "user") {
      return res.status(403).json({ message: "Managers can only manage accounts with the 'user' role" });
    }
    // Never let a manager promote/demote a user's role out from under them.
    if (updatePayload.role && updatePayload.role !== "user") {
      return res.status(403).json({ message: "Managers cannot change a user's role" });
    }
  }
  if (ADMIN_GRANTED_ROLES.includes(updatePayload.role) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only an admin can make someone a manager or sales manager" });
  }

  if (updatePayload.email) {
    updatePayload.email = String(updatePayload.email).trim().toLowerCase();
  }

  if (updatePayload.password) {
    updatePayload.password = await bcrypt.hash(updatePayload.password, BCRYPT_ROUNDS);
  }

  if (updatePayload.salary !== undefined) {
    updatePayload.salary = updatePayload.salary === "" || updatePayload.salary === null ? null : Number(updatePayload.salary);
  }
  if (updatePayload.doj !== undefined) {
    updatePayload.doj = updatePayload.doj ? new Date(updatePayload.doj) : null;
  }
  if (typeof updatePayload.pan === "string") {
    updatePayload.pan = updatePayload.pan.trim().toUpperCase();
  }
  if (typeof updatePayload.bloodGroup === "string") {
    updatePayload.bloodGroup = updatePayload.bloodGroup.trim().toUpperCase();
  }

  const user = await User.findByIdAndUpdate(req.params.id, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ message: "User updated successfully" });
});

// ── UPLOAD USER PHOTO ───────────────────────────────────────────────────────
exports.uploadUserPhotoMiddleware = userPhotoUpload.receive;

exports.uploadUserPhoto = asyncHandler(async (req, res) => {
  const file = req.files?.[0] || req.file;
  if (!file) {
    return res.status(400).json({ message: "No photo file uploaded" });
  }

  const existing = await User.findById(req.params.id).select("role photo");
  if (!existing) {
    removeFiles([file]);
    return res.status(404).json({ message: "User not found" });
  }
  if (req.user.role === "manager" && existing.role !== "user") {
    removeFiles([file]);
    return res.status(403).json({ message: "Managers can only manage accounts with the 'user' role" });
  }

  let normalized;
  try {
    normalized = await userPhotoUpload.normalize(file);
  } catch (err) {
    removeFiles([file]);
    return res.status(err.statusCode || 400).json({ message: err.message || "Invalid image file" });
  }

  if (existing.photo && existing.photo !== normalized.filename) {
    userPhotoUpload.removeFile(existing.photo);
  }

  existing.photo = normalized.filename;
  await existing.save();

  return res.json({ message: "Photo uploaded successfully", photo: normalized.filename });
});

// ── UPLOAD / DELETE USER DOCUMENTS ──────────────────────────────────────────
exports.uploadUserDocumentsMiddleware = (req, res, next) => {
  userDocsUpload(req, res, (err) => {
    if (!err) return next();
    return res.status(err.status || 400).json({ message: err.message || "Document upload failed" });
  });
};

exports.uploadUserDocuments = asyncHandler(async (req, res) => {
  const filesMap = req.files || {};
  const aadharFile = filesMap.aadharDoc?.[0];
  const panFile = filesMap.panDoc?.[0];
  const otherFiles = filesMap.otherDocs || [];

  const cleanupIncoming = () => {
    [aadharFile, panFile, ...otherFiles].filter(Boolean).forEach((f) => removeUserDocFile(f.filename));
  };

  if (!aadharFile && !panFile && !otherFiles.length) {
    return res.status(400).json({ message: "No documents uploaded" });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    cleanupIncoming();
    return res.status(404).json({ message: "User not found" });
  }
  if (req.user.role === "manager" && user.role !== "user") {
    cleanupIncoming();
    return res.status(403).json({ message: "Managers can only manage accounts with the 'user' role" });
  }

  if (aadharFile) {
    if (user.aadharDoc?.filename) removeUserDocFile(user.aadharDoc.filename);
    user.aadharDoc = { filename: aadharFile.filename, originalName: aadharFile.originalname, uploadedAt: new Date() };
  }
  if (panFile) {
    if (user.panDoc?.filename) removeUserDocFile(user.panDoc.filename);
    user.panDoc = { filename: panFile.filename, originalName: panFile.originalname, uploadedAt: new Date() };
  }
  if (otherFiles.length) {
    otherFiles.forEach((f) => {
      user.otherDocs.push({ filename: f.filename, originalName: f.originalname, uploadedAt: new Date() });
    });
  }

  await user.save();
  const safeUser = user.toObject();
  delete safeUser.password;
  return res.json({ message: "Documents uploaded successfully", user: safeUser });
});

exports.deleteUserDocument = asyncHandler(async (req, res) => {
  const { docType, docId } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (req.user.role === "manager" && user.role !== "user") {
    return res.status(403).json({ message: "Managers can only manage accounts with the 'user' role" });
  }

  if (docType === "aadharDoc" && user.aadharDoc?.filename) {
    removeUserDocFile(user.aadharDoc.filename);
    user.aadharDoc = undefined;
  } else if (docType === "panDoc" && user.panDoc?.filename) {
    removeUserDocFile(user.panDoc.filename);
    user.panDoc = undefined;
  } else if (docType === "otherDocs" && docId) {
    const idx = (user.otherDocs || []).findIndex((d) => String(d._id) === String(docId));
    if (idx >= 0) {
      removeUserDocFile(user.otherDocs[idx].filename);
      user.otherDocs.splice(idx, 1);
    }
  } else {
    return res.status(400).json({ message: "Invalid document reference" });
  }

  await user.save();
  const safeUser = user.toObject();
  delete safeUser.password;
  return res.json({ message: "Document removed", user: safeUser });
});

// ── LOGIN ────────────────────────────────────────────────────────────────────
// Normal DB-backed login for every role, including admin — bcrypt-verified
// against the stored hash. There is no hardcoded-credential bypass: the
// admin account is bootstrapped and its email/password are set via the OTP
// credential-recovery flow (see controllers/adminRecoveryController.js),
// after which it's just a regular User document like any other.
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  // Use a constant-time comparison fallback to prevent user-enumeration timing
  // attacks: if no user is found, run bcrypt.compare against a dummy hash so
  // the response time is indistinguishable from a wrong-password response.
  const dummyHash = "$2b$12$invalidhashpaddingtomakesurewe.tookthesametimeasrealcheck";
  const passwordToCheck = user ? user.password : dummyHash;
  const isMatch = await bcrypt.compare(password, passwordToCheck);

  if (!user || !isMatch) {
    // Generic message — never reveal whether the email exists in the system
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: "Your account is inactive. Please contact the administrator." });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  // Client-portal logins are not employee clock-ins
  if (user.role !== "client") {
    await createLoginAttendance(user._id);
  }

  res.cookie("access_token", token, COOKIE_OPTIONS);

  return res.json({
    message: "Login successful",
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
exports.logoutUser = asyncHandler(async (req, res) => {
  try {
    await logoutAttendance(req.user.id);
  } catch (attendanceError) {
    // 404 means no open attendance record — not an error worth propagating
    if (attendanceError.statusCode !== 404) throw attendanceError;
  }

  // Clear the httpOnly cookie regardless of how the token was originally sent
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.json({ message: "Logout successful" });
});
