const express = require("express");
const router = express.Router();
const { listCategories, createCategory } = require("../controllers/clientCategoryController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// Client industry categories: anyone who adds / views clients can list them;
// anyone who can add a client can add a category from the form's "+".
router.get("/", authMiddleware, requireRole("admin", "salesmanager", "sales", "user"), listCategories);
router.post("/", authMiddleware, requireRole("admin", "salesmanager", "sales"), createCategory);

module.exports = router;
