const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const attendanceService = require("../services/attendanceService");

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    console.log("Searching for:", normalizedEmail);
console.log("Found user:", existingUser);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
  console.log("FULL ERROR:", error); // 🔥 full Mongo error

  if (error?.code === 11000) {
    console.log("Duplicate key:", error.keyValue); // 🔥 MOST IMPORTANT

    return res.status(400).json({ message: "User already exists" });
  }

  return res.status(500).json({
    message: error.message || "Failed to create user"
  });
}
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

    if (updatePayload.email) {
      updatePayload.email = String(updatePayload.email).trim().toLowerCase();
    }

    if (updatePayload.password) {
      updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to update user" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    let attendance = null;
    if (user.role !== "admin") {
      attendance = await attendanceService.createLoginAttendance(user._id);
    }

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      attendance,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.json({
        message: "Logout successful",
        attendance: null,
      });
    }

    const attendance = await attendanceService.logoutAttendance(req.user.id);
    return res.json({
      message: "Logout successful",
      attendance,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to logout" });
  }
};
