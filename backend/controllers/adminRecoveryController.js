const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { createTransporter } = require("../services/clientService");

// ── Hardcoded recovery email ─────────────────────────────────────────────────
// This is the ONLY address the OTP is ever sent to, regardless of whatever
// the admin's current login email is. It is never read from req.body — the
// frontend registration/reset panel only ever displays it, never lets it be
// edited. Overridable via env for ops convenience, but never from the UI.
const ADMIN_RECOVERY_EMAIL = (process.env.ADMIN_RECOVERY_EMAIL || "himanshu.tiwarii.dev@gmail.com").trim();

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL = "10m";

const generateOtp = () => String(crypto.randomInt(100000, 1000000)); // 6 digits

const clearOtpFields = (user) => {
  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  // otpSessionId is left untouched here — callers that need to fully
  // invalidate a reset session clear it explicitly (see set-credentials).
};

// ── 1. Send OTP to the hardcoded recovery email ─────────────────────────────
// Creates the admin user record on first-ever call (replaces the old
// env-var login bootstrap) with a random, unusable password until
// set-credentials completes.
exports.sendOtp = asyncHandler(async (req, res) => {
  // Most-recently-created admin wins if more than one admin-role record
  // exists (e.g. stale leftovers from before this flow existed) — that's
  // the one actually being logged into today.
  let admin = await User.findOne({ role: "admin" }).sort({ createdAt: -1 });

  if (!admin) {
    const placeholderPassword = await bcrypt.hash(crypto.randomUUID(), BCRYPT_ROUNDS);
    admin = await User.create({
      name: "Admin",
      email: ADMIN_RECOVERY_EMAIL.toLowerCase(),
      password: placeholderPassword,
      role: "admin",
      isActive: false,
    });
  }

  const otp = generateOtp();
  admin.otpCodeHash = await bcrypt.hash(otp, 10);
  admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  admin.otpAttempts = 0;
  admin.otpSessionId = crypto.randomBytes(16).toString("hex");
  await admin.save();

  const transporter = createTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "Automated mail";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: ADMIN_RECOVERY_EMAIL,
    subject: "Your admin verification code",
    text: `Your admin verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your admin verification code is <strong style="font-size:20px">${otp}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });

  return res.json({ message: "OTP sent to the registered recovery email." });
});

// ── 2. Verify OTP, issue a short-lived credential-reset token ───────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp || !/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ message: "Enter the 6-digit code." });
  }

  // Target whichever admin record actually has a pending OTP — correct
  // regardless of how many admin-role records exist, unlike guessing by
  // "most recent" independently in every endpoint.
  const admin = await User.findOne({ role: "admin", otpCodeHash: { $ne: null } }).select(
    "+otpCodeHash +otpExpiresAt +otpAttempts +otpSessionId"
  );

  if (!admin || !admin.otpCodeHash || !admin.otpExpiresAt) {
    return res.status(400).json({ message: "No OTP requested. Please request a new code." });
  }

  if (admin.otpExpiresAt.getTime() < Date.now()) {
    clearOtpFields(admin);
    await admin.save();
    return res.status(400).json({ message: "This code has expired. Please request a new one." });
  }

  if (admin.otpAttempts >= OTP_MAX_ATTEMPTS) {
    clearOtpFields(admin);
    await admin.save();
    return res.status(400).json({ message: "Too many incorrect attempts. Please request a new code." });
  }

  const isMatch = await bcrypt.compare(String(otp), admin.otpCodeHash);
  if (!isMatch) {
    admin.otpAttempts += 1;
    await admin.save();
    return res.status(400).json({ message: "Incorrect code. Please try again." });
  }

  // Single-use: the code itself can never be verified again after this,
  // whether or not the admin goes on to complete set-credentials.
  clearOtpFields(admin);
  await admin.save();

  const resetToken = jwt.sign(
    { purpose: "admin-credential-reset", adminId: admin._id, sessionId: admin.otpSessionId },
    process.env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_TTL }
  );

  return res.json({ resetToken });
});

// ── 3. Set new admin email + password using the verified reset token ───────
exports.setCredentials = asyncHandler(async (req, res) => {
  const { resetToken, newEmail, newPassword } = req.body;

  if (!resetToken) {
    return res.status(400).json({ message: "Missing reset token. Please verify the OTP again." });
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "This reset session has expired. Please verify the OTP again." });
  }

  if (decoded.purpose !== "admin-credential-reset") {
    return res.status(401).json({ message: "Invalid reset token." });
  }

  const normalizedEmail = String(newEmail || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const admin = await User.findById(decoded.adminId).select("+otpSessionId");
  if (!admin || !admin.otpSessionId || admin.otpSessionId !== decoded.sessionId) {
    return res.status(401).json({ message: "This reset session is no longer valid. Please verify the OTP again." });
  }

  const emailTaken = await User.findOne({ email: normalizedEmail, _id: { $ne: admin._id } });
  if (emailTaken) {
    return res.status(400).json({ message: "That email is already in use by another account." });
  }

  admin.email = normalizedEmail;
  admin.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  admin.isActive = true;
  admin.otpSessionId = undefined; // single-use — this reset token can never be replayed
  await admin.save();

  return res.json({ message: "Admin credentials updated. You can now log in with the new email and password." });
});
