const express = require("express");
const router = express.Router();

const {
  createTask,
  getTask,
  getMyTasks,
  updateTaskStatus,
  deleteTask,
  updateTask,
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");


// 🔐 Admin Routes
router.post("/", authMiddleware, adminOnly, createTask);
router.get("/", authMiddleware, adminOnly, getTask);
router.delete("/:id", authMiddleware, adminOnly, deleteTask);
router.put("/update-task/:id", authMiddleware, updateTask);

// 👤 User Routes
router.get("/my-tasks", authMiddleware, getMyTasks);
router.patch("/update-status/:id", authMiddleware, updateTaskStatus);

module.exports = router;