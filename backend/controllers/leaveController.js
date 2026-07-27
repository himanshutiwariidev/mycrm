const Leave = require("../models/Leave");

exports.applyLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "From date, to date and reason are required" });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ message: "From date cannot be after to date" });
    }

    const leave = await Leave.create({
      userId: req.user.id,
      fromDate,
      toDate,
      reason,
    });

    return res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit leave request" });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch leave requests" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const leaves = await Leave.find(query)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });
    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch leave requests" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, adminComment } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, adminComment, reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    ).populate("userId", "name email role");

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    return res.json({ message: `Leave request ${status}`, leave });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update leave request" });
  }
};
