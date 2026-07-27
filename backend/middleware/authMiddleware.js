const jwt = require("jsonwebtoken");

// Accepts tokens from two sources (highest-security first):
//   1. HttpOnly cookie "access_token" — set by the server on login.
//   2. Authorization: Bearer <token> header — backward-compatible with the
//      existing React frontend that reads tokens from localStorage.
// Both paths set req.user identically; no behaviour change for existing callers.
const authMiddleware = (req, res, next) => {
  try {
    // Prefer the httpOnly cookie when present
    let token = req.cookies?.access_token;

    // Fall back to the Authorization header (existing frontend flow)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
