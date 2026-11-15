const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  getAdminData,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public Authentication Endpoints
router.post("/register", registerUser);
router.post("/login", loginUser);

// Verified Session Restoration & Profile
router.get("/me", protect, getMe);
router.get("/profile", protect, getMe);
router.get("/verify", protect, getMe);

// Admin-Protected Endpoints
router.get("/admin/users", protect, authorize("admin"), getAdminData);
router.get("/admin/dashboard", protect, authorize("admin"), getAdminData);

module.exports = router;
