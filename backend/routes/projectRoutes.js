const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

router.post("/", authMiddleware, adminOnly, createProject);
router.get("/", authMiddleware, adminOnly, getProjects);
router.put("/:id", authMiddleware, adminOnly, updateProject);
router.delete("/:id", authMiddleware, adminOnly, deleteProject);

module.exports = router;
