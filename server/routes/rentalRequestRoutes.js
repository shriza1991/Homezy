const express = require("express");
const {
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  getRentalRequestById,
  updateRentalRequestStatus,
  deleteRentalRequest,
} = require("../controllers/rentalRequestController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Tenant submission & personal application history
router.post("/", protect, createRentalRequest);
router.get("/my", protect, getMyRentalRequests);

// Admin-only listing of all applications
router.get("/", protect, authorize("admin"), getAllRentalRequests);

// Inspect single application (with strict tenant/admin access validation)
router.get("/:id", protect, getRentalRequestById);

// Admin approval/rejection actions
router.patch("/:id/status", protect, authorize("admin"), updateRentalRequestStatus);
router.put("/:id/status", protect, authorize("admin"), updateRentalRequestStatus);

// Tenant withdrawal / Admin deletion
router.delete("/:id", protect, deleteRentalRequest);

module.exports = router;
