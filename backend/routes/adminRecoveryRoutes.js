const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { sendOtp, verifyOtp, setCredentials } = require("../controllers/adminRecoveryController");

// ── Rate limiting ────────────────────────────────────────────────────────────
// This is the one set of endpoints in the app reachable without a login, so
// it's the most important place to throttle. Per-IP windows; deliberately
// separate limiters since send/verify/set have different abuse profiles.
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Please try again later." },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

const setCredentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

// All three are intentionally unauthenticated — this is the admin
// credential-recovery entry point. Security comes from possession of the
// hardcoded recovery inbox (OTP) + rate limiting + short-lived single-use
// tokens, not from a login being required beforehand.
router.post("/send-otp", sendOtpLimiter, sendOtp);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);
router.post("/set-credentials", setCredentialsLimiter, setCredentials);

module.exports = router;
