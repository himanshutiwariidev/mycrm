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

// 🔓 Public Route
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);

router.post("/register-admin", createUser);
// 🔐 Admin Routes
router.post("/", authMiddleware, adminOnly, createUser);
router.get("/", authMiddleware, adminOnly, getAllUsers);
router.delete("/:id", authMiddleware, adminOnly, deleteUser);
router.put("/:id", authMiddleware, adminOnly, updateUser);


module.exports = router;
