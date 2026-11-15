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

// Default canonical in-memory demo accounts for disconnected / test mode
const defaultDemoUsers = [
  {
    _id: "demo-tenant-id",
    id: "demo-tenant-id",
    name: "Demo Tenant",
    email: "tenant@homezy.com",
    phone: "9876543210",
    role: "tenant",
    password: "password123",
  },
  {
    _id: "demo-admin-id",
    id: "demo-admin-id",
    name: "Demo Admin",
    email: "admin@homezy.com",
    phone: "9876543211",
    role: "admin",
    password: "password123",
  },
  {
    _id: "demo-owner-id",
    id: "demo-owner-id",
    name: "Demo Owner",
    email: "owner@homezy.com",
    phone: "9876543212",
    role: "owner",
    password: "password123",
  },
];

let memoryUsers = defaultDemoUsers.map((u) => ({ ...u }));

const resetMemoryUsers = (newUsers) => {
  memoryUsers = newUsers
    ? newUsers.map((u) => ({ ...u }))
    : defaultDemoUsers.map((u) => ({ ...u }));
  return memoryUsers;
};

const getMemoryUsers = () => memoryUsers;

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please provide all required fields: name, email, phone, password",
      });
    }

    const validRoles = ["tenant", "owner", "admin"];
    const userRole = role && validRoles.includes(role) ? role : "tenant";

    if (mongoose.connection.readyState === 1) {
      // Check if user already exists in MongoDB
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

      return res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // In-memory fallback when MongoDB is disconnected
    const normalizedEmail = email.trim().toLowerCase();
    const existingMem = memoryUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (existingMem) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const newUser = {
      _id: "mem-user-" + Date.now(),
      id: "mem-user-" + Date.now(),
      name,
      email: normalizedEmail,
      phone,
      role: userRole,
      password,
    };

    memoryUsers.push(newUser);

    res.status(201).json({
      message: "User registered successfully (in-memory mode)",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
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
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Generate JWT
      const token = createToken(user);

      return res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // In-memory fallback login
    const memUser = memoryUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!memUser) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid =
      memUser.password === password ||
      (await bcrypt.compare(password, memUser.password).catch(() => false));

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(memUser);

    res.json({
      message: "Login successful (in-memory mode)",
      token,
      user: {
        id: memUser._id || memUser.id,
        name: memUser.name,
        email: memUser.email,
        role: memUser.role,
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

    // Fallback response in in-memory mode
    const safeUsers = memoryUsers.map(({ password: _, ...rest }) => rest);
    res.status(200).json({
      message: "Admin overview (in-memory mode)",
      stats: {
        totalUsers: memoryUsers.length,
        tenants: memoryUsers.filter((u) => u.role === "tenant").length,
        owners: memoryUsers.filter((u) => u.role === "owner").length,
        admins: memoryUsers.filter((u) => u.role === "admin").length,
        activeListings: 4,
      },
      users: safeUsers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch admin data",
      error: error.message,
    });
  }
};

module.exports = {
  createToken,
  registerUser,
  loginUser,
  getMe,
  getAdminData,
  resetMemoryUsers,
  getMemoryUsers,
  defaultDemoUsers,
};
