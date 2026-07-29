const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { createLoginAttendance, logoutAttendance } = require("../services/attendanceService");

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

// ── CREATE USER (admin / HR only) ───────────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await User.create({ name, email: normalizedEmail, password: hashedPassword, role });

  return res.status(201).json({ message: "User created successfully" });
});

// ── GET ALL USERS ───────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  return res.json(users);
});

// ── GET USERS BY ROLE ───────────────────────────────────────────────────────
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const users = await User.find({ role, isActive: true }).select("-password");
  return res.json(users);
});

// ── DELETE USER ─────────────────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return res.json({ message: "User deleted successfully" });
});

// ── UPDATE USER ─────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const updatePayload = { ...req.body };

  if (updatePayload.email) {
    updatePayload.email = String(updatePayload.email).trim().toLowerCase();
  }

  if (updatePayload.password) {
    updatePayload.password = await bcrypt.hash(updatePayload.password, BCRYPT_ROUNDS);
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
