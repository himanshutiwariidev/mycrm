const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUsersByRole,
  deleteUser,
  updateUser,
  logoutUser,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { requireRole } = require("../middleware/roleAccess");
const { loginValidator, createUserValidator, updateUserValidator } = require("../middleware/validator");

// ── Public: Login ─────────────────────────────────────────────────────────
// Input-validated before the handler runs.
// NOTE: the main login endpoint lives at POST /api/login in Server.js;
// this duplicate at /api/users/login is kept for backward compatibility.
const { loginUser } = require("../controllers/userController");
router.post("/login", loginValidator, loginUser);

// ── Auth: Logout ──────────────────────────────────────────────────────────
router.post("/logout", authMiddleware, logoutUser);

// ── Admin-bootstrap route ─────────────────────────────────────────────────
// This route previously had no authentication and allowed anyone to create
// an account — a critical security hole.  It is now protected so only an
// existing admin can call it.  The very first admin account is instead
// bootstrapped via the OTP credential-recovery flow at /api/admin-recovery
// (see adminRecoveryController.js), which only ever emails the hardcoded
// recovery address — no unauthenticated bootstrap path exists here anymore.
router.post("/register-admin", authMiddleware, requireRole("admin"), createUser);

// ── Admin / HR routes ─────────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "hr"),
  createUserValidator,
  createUser
);

router.get("/", authMiddleware, requireRole("admin", "hr"), getAllUsers);

// requireRole only gates entry here; the controller further restricts a
// "sales" caller to role=sales lookups only (see getUsersByRole).
router.get("/by-role/:role", authMiddleware, requireRole("admin", "sales"), getUsersByRole);

router.delete("/:id", authMiddleware, requireRole("admin", "hr"), deleteUser);

router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "hr"),
  updateUserValidator,
  updateUser
);

module.exports = router;
