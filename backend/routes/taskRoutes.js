const express = require("express");
const router = express.Router();

const {
  createTask,
  getTask,
  getMyTasks,
  updateTaskStatus,
  updateDeliverableProgress,
  deleteTask,
  updateTask,
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// 🔐 Admin + Manager Routes — a manager's Task section works exactly like
// admin's (not adminOnly, which is strictly "admin" and would lock managers
// out of this section entirely).
router.post("/", authMiddleware, requireRole("admin", "manager"), createTask);
router.get("/", authMiddleware, requireRole("admin", "manager"), getTask);
router.delete("/:id", authMiddleware, requireRole("admin", "manager"), deleteTask);
router.put("/update-task/:id", authMiddleware, updateTask);

// 👤 User Routes
router.get("/my-tasks", authMiddleware, getMyTasks);
router.patch("/update-status/:id", authMiddleware, updateTaskStatus);
router.patch("/:id/deliverables/:deliverableId", authMiddleware, updateDeliverableProgress);

module.exports = router;