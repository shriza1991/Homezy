const express = require("express");
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  seedProperties,
} = require("../controllers/propertyController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { blockInProduction } = require("../middleware/productionGuard");

const router = express.Router();

// Public property browsing routes
router.get("/", getProperties);
router.get("/:id", getPropertyById);

// Database seeding helper (disabled in production)
router.post("/seed", blockInProduction, seedProperties);

// Protected property management routes (owners and admins only)
router.post("/", protect, authorize("owner", "admin"), createProperty);
router.put("/:id", protect, authorize("owner", "admin"), updateProperty);
router.delete("/:id", protect, authorize("owner", "admin"), deleteProperty);

module.exports = router;
