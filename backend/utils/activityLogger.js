const ActivityLog = require("../models/ActivityLog");

// Best-effort audit trail — a logging failure must never break the real request.
const logActivity = async (clientId, type, message, meta) => {
  try {
    if (!clientId) return;
    await ActivityLog.create({ clientId, type, message, meta });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

module.exports = { logActivity };
