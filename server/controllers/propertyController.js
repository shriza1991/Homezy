const mongoose = require("mongoose");
const Property = require("../models/Property");

// Seed properties matching existing Homezy catalog
const initialPropertiesSeed = [
  {
    title: "Modern 2 BHK Apartment",
    description: "Modern apartment with spacious rooms and excellent connectivity.",
    location: "Andheri, Mumbai",
    price: "25,000",
    type: "Apartment",
    status: "Available",
    bedrooms: "2 BHK",
    bathrooms: 2,
    area: "1200 sq.ft",
    furnished: "Yes",
    amenities: ["Parking", "Wi-Fi", "Security", "Lift"],
  },
  {
    title: "Spacious 3 BHK House",
    description: "Large family house located in a peaceful residential area.",
    location: "Powai, Mumbai",
    price: "40,000",
    type: "Independent House",
    status: "Available",
    bedrooms: "3 BHK",
    bathrooms: 3,
    area: "1800 sq.ft",
    furnished: "Semi-furnished",
    amenities: ["Parking", "Garden", "Security", "Water Supply"],
  },
  {
    title: "Cozy 1 BHK Flat",
    description: "Comfortable and affordable flat suitable for working professionals.",
    location: "Bandra, Mumbai",
    price: "20,000",
    type: "Flat",
    status: "Available",
    bedrooms: "1 BHK",
    bathrooms: 1,
    area: "650 sq.ft",
    furnished: "Yes",
    amenities: ["Wi-Fi", "Security", "Lift"],
  },
  {
    title: "Luxury 2 BHK Apartment",
    description: "Premium apartment with modern interiors and excellent amenities.",
    location: "Worli, Mumbai",
    price: "55,000",
    type: "Luxury Apartment",
    status: "Available",
    bedrooms: "2 BHK",
    bathrooms: 2,
    area: "1400 sq.ft",
    furnished: "Fully Furnished",
    amenities: ["Swimming Pool", "Gym", "Parking", "Security", "Clubhouse"],
  },
];

// In-memory property store for tests or disconnected mode
let memoryProperties = initialPropertiesSeed.map((p, idx) => ({
  ...p,
  _id: `mem-${idx + 1}`,
  id: idx + 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

/**
 * Filter properties array in memory
 */
const filterMemoryProperties = (items, search, type, status) => {
  let result = [...items];

  if (search && search.trim()) {
    const query = search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }

  if (type && type.trim()) {
    result = result.filter(
      (p) => p.type.toLowerCase() === type.trim().toLowerCase()
    );
  }

  if (status && status.trim()) {
    result = result.filter(
      (p) => p.status.toLowerCase() === status.trim().toLowerCase()
    );
  }

  return result;
};

// GET /api/properties
const getProperties = async (req, res) => {
  const { search, type, category, status } = req.query;
  const targetType = type || category;

  try {
    if (mongoose.connection.readyState === 1) {
      // Auto-seed collection if empty
      const count = await Property.countDocuments();
      if (count === 0) {
        await Property.insertMany(initialPropertiesSeed);
      }

      const query = {};

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [{ title: regex }, { location: regex }, { description: regex }];
      }

      if (targetType && targetType.trim()) {
        query.type = targetType.trim();
      }

      if (status && status.trim()) {
        query.status = status.trim();
      }

      const properties = await Property.find(query)
        .populate("owner", "name email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: properties.length,
        properties,
      });
    }

    // Disconnected / in-memory mode
    const filtered = filterMemoryProperties(
      memoryProperties,
      search,
      targetType,
      status
    );

    res.status(200).json({
      success: true,
      count: filtered.length,
      properties: filtered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

// GET /api/properties/:id
const getPropertyById = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        const property = await Property.findById(id).populate("owner", "name email role");
        if (property) {
          return res.status(200).json({
            success: true,
            property,
          });
        }
      }
      // Check title match or fallback
      const propertyByTitle = await Property.findOne({
        title: new RegExp(`^${id}$`, "i"),
      });
      if (propertyByTitle) {
        return res.status(200).json({
          success: true,
          property: propertyByTitle,
        });
      }
    }

    // In-memory search (by _id, numeric id, or title)
    const memProperty = memoryProperties.find(
      (p) =>
        String(p._id) === String(id) ||
        String(p.id) === String(id) ||
        p.title.toLowerCase() === decodeURIComponent(id).toLowerCase()
    );

    if (memProperty) {
      return res.status(200).json({
        success: true,
        property: memProperty,
      });
    }

    res.status(404).json({
      success: false,
      message: `Property with ID '${id}' not found`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving property",
      error: error.message,
    });
  }
};

// POST /api/properties
const createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      price,
      type,
      status,
      bedrooms,
      bathrooms,
      area,
      furnished,
      amenities,
    } = req.body;

    if (!title || !description || !location || !price) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: title, description, location, price",
      });
    }

    const propertyPayload = {
      title,
      description,
      location,
      price: String(price),
      type: type || "Apartment",
      status: status || "Available",
      bedrooms: bedrooms || "2 BHK",
      bathrooms: Number(bathrooms) || 2,
      area: area || "1200 sq.ft",
      furnished: furnished || "Yes",
      amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ["Parking", "Wi-Fi", "Security", "Lift"],
      owner: req.user?.id || null,
    };

    if (mongoose.connection.readyState === 1) {
      const property = await Property.create(propertyPayload);
      return res.status(201).json({
        success: true,
        message: "Property created successfully",
        property,
      });
    }

    // In-memory creation
    const newMemProperty = {
      ...propertyPayload,
      _id: `mem-${Date.now()}`,
      id: memoryProperties.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryProperties.unshift(newMemProperty);

    res.status(201).json({
      success: true,
      message: "Property created successfully (in-memory)",
      property: newMemProperty,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create property",
      error: error.message,
    });
  }
};

// PUT /api/properties/:id
const updateProperty = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID format" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check ownership or admin privilege
      if (property.owner && property.owner.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this property",
        });
      }

      const updated = await Property.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Property updated successfully",
        property: updated,
      });
    }

    // In-memory update
    const index = memoryProperties.findIndex(
      (p) => String(p._id) === String(id) || String(p.id) === String(id)
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    memoryProperties[index] = {
      ...memoryProperties[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      property: memoryProperties[index],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update property",
      error: error.message,
    });
  }
};

// DELETE /api/properties/:id
const deleteProperty = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID format" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      if (property.owner && property.owner.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this property",
        });
      }

      await Property.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Property deleted successfully",
      });
    }

    // In-memory deletion
    const index = memoryProperties.findIndex(
      (p) => String(p._id) === String(id) || String(p.id) === String(id)
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    memoryProperties.splice(index, 1);

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete property",
      error: error.message,
    });
  }
};

// POST /api/properties/seed
const seedProperties = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Property.deleteMany({});
      const seeded = await Property.insertMany(initialPropertiesSeed);
      return res.status(200).json({
        success: true,
        message: "Properties seeded successfully into MongoDB",
        count: seeded.length,
        properties: seeded,
      });
    }

    memoryProperties = initialPropertiesSeed.map((p, idx) => ({
      ...p,
      _id: `mem-${idx + 1}`,
      id: idx + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    res.status(200).json({
      success: true,
      message: "Properties seeded in memory",
      count: memoryProperties.length,
      properties: memoryProperties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error seeding properties",
      error: error.message,
    });
  }
};

const resetMemoryProperties = (newProps) => {
  memoryProperties = newProps
    ? newProps.map((p, idx) => ({
        ...p,
        _id: p._id || `mem-${idx + 1}`,
        id: p.id || idx + 1,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      }))
    : initialPropertiesSeed.map((p, idx) => ({
        ...p,
        _id: `mem-${idx + 1}`,
        id: idx + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
  return memoryProperties;
};

const getMemoryProperties = () => memoryProperties;

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  seedProperties,
  initialPropertiesSeed,
  resetMemoryProperties,
  getMemoryProperties,
};
