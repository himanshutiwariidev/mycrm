const Meeting = require("../models/Meeting");

exports.createMeeting = async (req, res) => {
  try {
    const { title, meetingDate, description, location, attendees } = req.body;

    if (!title || !meetingDate) {
      return res.status(400).json({ message: "Title and meeting date are required" });
    }

    const meeting = await Meeting.create({
      title,
      meetingDate,
      description,
      location,
      attendees,
      createdBy: req.user.id,
    });
    await meeting.populate("createdBy", "name email");

    return res.status(201).json({ message: "Meeting scheduled successfully", meeting });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return res.status(500).json({ message: error.message || "Failed to schedule meeting" });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().populate("createdBy", "name email").sort({ meetingDate: 1 });
    return res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch meetings" });
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    const { title, meetingDate, description, location, attendees } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { title, meetingDate, description, location, attendees },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({ message: "Meeting updated successfully", meeting });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return res.status(500).json({ message: error.message || "Failed to update meeting" });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    return res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return res.status(500).json({ message: error.message || "Failed to delete meeting" });
  }
};
