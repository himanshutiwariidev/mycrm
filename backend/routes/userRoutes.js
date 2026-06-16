const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  deleteUser,
  updateUser,
  loginUser,
  logoutUser,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { requireRole } = require("../middleware/roleAccess");

// 🔓 Public Route
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);

router.post("/register-admin", createUser);
// 🔐 Admin Routes
router.post("/", authMiddleware, requireRole("admin", "hr"), createUser);
router.get("/", authMiddleware, requireRole("admin", "hr"), getAllUsers);
router.delete("/:id", authMiddleware, requireRole("admin", "hr"), deleteUser);
router.put("/:id", authMiddleware, requireRole("admin", "hr"), updateUser);


module.exports = router;
