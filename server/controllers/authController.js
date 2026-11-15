const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT token with standard claims
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || "homezy_development_secret_key",
    {
      expiresIn: "1d",
    }
  );
};

// Register User
const registerUser = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database service is not connected. Please verify MongoDB Atlas configuration.",
    });
  }

  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please provide all required fields: name, email, phone, password",
      });
    }

    const validRoles = ["tenant", "owner", "admin"];
    const userRole = role && validRoles.includes(role) ? role : "tenant";

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      role: userRole,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database service is not connected. Please verify MongoDB Atlas configuration.",
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// Get current user session (Verified Session Restoration)
const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  res.status(200).json({
    message: "Session verified",
    user: req.user,
  });
};

// Admin overview & user list (Admin Authorization Check)
const getAdminData = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select("-password").sort({ createdAt: -1 });
      const stats = {
        totalUsers: users.length,
        tenants: users.filter((u) => u.role === "tenant").length,
        owners: users.filter((u) => u.role === "owner").length,
        admins: users.filter((u) => u.role === "admin").length,
        activeListings: 4,
      };

      return res.status(200).json({
        message: "Admin statistics and user directory retrieved",
        stats,
        users,
      });
    }

    // Fallback response in disconnected mode
    res.status(200).json({
      message: "Admin overview (degraded mode)",
      stats: {
        totalUsers: 1,
        tenants: 0,
        owners: 0,
        admins: 1,
        activeListings: 4,
      },
      users: [req.user],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch admin data",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAdminData,
};
