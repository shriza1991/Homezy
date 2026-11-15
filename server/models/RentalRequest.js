const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantName: {
      type: String,
      required: true,
      trim: true,
    },
    tenantEmail: {
      type: String,
      required: true,
      trim: true,
    },
    tenantPhone: {
      type: String,
      required: true,
      trim: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: false,
    },
    propertyTitle: {
      type: String,
      required: true,
      trim: true,
    },
    propertyLocation: {
      type: String,
      trim: true,
      default: "Mumbai",
    },
    monthlyRent: {
      type: String,
      trim: true,
      default: "25,000",
    },
    moveInDate: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to help fast lookup of tenant requests
rentalRequestSchema.index({ tenant: 1, propertyTitle: 1, status: 1 });

module.exports = mongoose.model("RentalRequest", rentalRequestSchema);
