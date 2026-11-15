const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Apartment",
        "Independent House",
        "Flat",
        "Luxury Apartment",
        "Villa",
        "Studio",
      ],
      default: "Apartment",
    },
    status: {
      type: String,
      enum: ["Available", "Rented", "Pending"],
      default: "Available",
    },
    bedrooms: {
      type: String,
      default: "2 BHK",
    },
    bathrooms: {
      type: Number,
      default: 2,
    },
    area: {
      type: String,
      default: "1200 sq.ft",
    },
    furnished: {
      type: String,
      default: "Yes",
    },
    amenities: {
      type: [String],
      default: ["Parking", "Wi-Fi", "Security", "Lift"],
    },
    images: {
      type: [String],
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search queries across title and location
propertySchema.index({ title: "text", location: "text" });

module.exports = mongoose.model("Property", propertySchema);
