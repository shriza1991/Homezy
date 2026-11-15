const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getJwtSecret } = require("../config/jwt");

/**
 * Protect routes - Verifies JWT from Authorization header: 'Bearer <token>'
 * Attaches authenticated user object to req.user (excluding password)
 */
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      message: "Not authorized, no token provided",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    );

    // If database is connected, load latest user record
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          message: "User belonging to this token no longer exists",
        });
      }

      req.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      };
    } else {
      // In disconnected / test mode, populate req.user from decoded token payload
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email || null,
        name: decoded.name || null,
      };
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired, please log in again",
      });
    }
    return res.status(401).json({
      message: "Not authorized, invalid token",
    });
  }
};

/**
 * Authorize middleware factory - Restricts access to specified roles
 * Example: authorize("admin"), authorize("owner", "admin")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required before authorization",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
