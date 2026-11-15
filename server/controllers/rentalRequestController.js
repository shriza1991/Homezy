const mongoose = require("mongoose");
const RentalRequest = require("../models/RentalRequest");
const Property = require("../models/Property");
const { createAndEmitNotification } = require("./notificationController");

// In-memory store for test/disconnected mode
let memoryRentalRequests = [];

// POST /api/rental-requests - Submit new rental request (Tenants)
const createRentalRequest = async (req, res) => {
  try {
    const {
      propertyTitle,
      propertyLocation,
      monthlyRent,
      propertyId,
      phone,
      moveInDate,
      message,
    } = req.body;

    if (!propertyTitle || !propertyTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Property title is required",
      });
    }

    const tenantId = req.user.id;
    const tenantName = req.user.name || req.body.name || "Homezy Tenant";
    const tenantEmail = req.user.email || req.body.email || "tenant@example.com";
    const tenantPhone = phone || req.user.phone || req.body.phone || "Not specified";

    const cleanTitle = propertyTitle.trim();

    // DUPLICATE PREVENTION: Check for existing active/pending request for this property by this tenant
    if (mongoose.connection.readyState === 1) {
      const existingPending = await RentalRequest.findOne({
        tenant: tenantId,
        propertyTitle: new RegExp(`^${cleanTitle}$`, "i"),
        status: "Pending",
      });

      if (existingPending) {
        return res.status(409).json({
          success: false,
          message: `You already have an active pending request for "${cleanTitle}". Multiple pending applications for the same property are not permitted.`,
        });
      }

      // Check if property exists to associate property ObjectId and retrieve owner
      let propertyRef = null;
      let propertyOwnerId = null;
      if (propertyId && mongoose.isValidObjectId(propertyId)) {
        propertyRef = propertyId;
        const foundProp = await Property.findById(propertyId);
        if (foundProp && foundProp.owner) propertyOwnerId = foundProp.owner.toString();
      } else {
        const foundProp = await Property.findOne({ title: new RegExp(`^${cleanTitle}$`, "i") });
        if (foundProp) {
          propertyRef = foundProp._id;
          if (foundProp.owner) propertyOwnerId = foundProp.owner.toString();
        }
      }

      const request = await RentalRequest.create({
        tenant: tenantId,
        tenantName,
        tenantEmail,
        tenantPhone,
        property: propertyRef,
        propertyTitle: cleanTitle,
        propertyLocation: propertyLocation || "Mumbai",
        monthlyRent: monthlyRent || "25,000",
        moveInDate: moveInDate || new Date().toISOString().split("T")[0],
        message: message || "",
        status: "Pending",
      });

      // Notify administrator of new tenant application
      createAndEmitNotification({
        recipient: "admin",
        sender: tenantId,
        title: "New Rental Application",
        message: `${tenantName} submitted an application for "${cleanTitle}".`,
        type: "application_submitted",
        relatedId: String(request._id),
      }).catch(() => {});

      // Notify property owner if assigned
      if (propertyOwnerId && propertyOwnerId !== tenantId) {
        createAndEmitNotification({
          recipient: propertyOwnerId,
          sender: tenantId,
          title: "New Rental Application",
          message: `${tenantName} submitted an application for your property "${cleanTitle}".`,
          type: "application_submitted",
          relatedId: String(request._id),
        }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: "Rental request submitted successfully",
        request,
      });
    }

    // In-Memory Mode / Test execution
    const duplicate = memoryRentalRequests.find(
      (r) =>
        String(r.tenant) === String(tenantId) &&
        r.propertyTitle.toLowerCase() === cleanTitle.toLowerCase() &&
        r.status === "Pending"
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `You already have an active pending request for "${cleanTitle}". Multiple pending applications for the same property are not permitted.`,
      });
    }

    const newMemRequest = {
      _id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenant: tenantId,
      tenantName,
      tenantEmail,
      tenantPhone,
      property: propertyId || null,
      propertyTitle: cleanTitle,
      propertyLocation: propertyLocation || "Mumbai",
      monthlyRent: monthlyRent || "25,000",
      moveInDate: moveInDate || new Date().toISOString().split("T")[0],
      message: message || "",
      status: "Pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryRentalRequests.unshift(newMemRequest);

    // In-memory mode: resolve property owner
    const { getMemoryProperties } = require("./propertyController");
    const currentProps = getMemoryProperties();
    const foundMemProp = currentProps.find(
      (p) =>
        String(p._id) === String(propertyId) ||
        String(p.id) === String(propertyId) ||
        p.title.toLowerCase() === cleanTitle.toLowerCase()
    );
    const memPropertyOwnerId = foundMemProp && foundMemProp.owner ? String(foundMemProp.owner) : null;

    // Notify administrator in in-memory mode
    createAndEmitNotification({
      recipient: "admin",
      sender: tenantId,
      title: "New Rental Application",
      message: `${tenantName} submitted an application for "${cleanTitle}".`,
      type: "application_submitted",
      relatedId: String(newMemRequest._id),
    }).catch(() => {});

    // Notify property owner in in-memory mode
    if (memPropertyOwnerId && memPropertyOwnerId !== String(tenantId)) {
      createAndEmitNotification({
        recipient: memPropertyOwnerId,
        sender: tenantId,
        title: "New Rental Application",
        message: `${tenantName} submitted an application for your property "${cleanTitle}".`,
        type: "application_submitted",
        relatedId: String(newMemRequest._id),
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: "Rental request submitted successfully",
      request: newMemRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit rental request",
      error: error.message,
    });
  }
};

// GET /api/rental-requests/my - Get tenant's personal application history
const getMyRentalRequests = async (req, res) => {
  try {
    const tenantId = req.user.id;

    if (mongoose.connection.readyState === 1) {
      const requests = await RentalRequest.find({ tenant: tenantId })
        .populate("property", "title location price type status")
        .sort({ createdAt: -1 });

      const stats = {
        total: requests.length,
        pending: requests.filter((r) => r.status === "Pending").length,
        approved: requests.filter((r) => r.status === "Approved").length,
        rejected: requests.filter((r) => r.status === "Rejected").length,
      };

      return res.status(200).json({
        success: true,
        count: requests.length,
        stats,
        requests,
      });
    }

    const myRequests = memoryRentalRequests.filter(
      (r) => String(r.tenant) === String(tenantId)
    );

    const stats = {
      total: myRequests.length,
      pending: myRequests.filter((r) => r.status === "Pending").length,
      approved: myRequests.filter((r) => r.status === "Approved").length,
      rejected: myRequests.filter((r) => r.status === "Rejected").length,
    };

    res.status(200).json({
      success: true,
      count: myRequests.length,
      stats,
      requests: myRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rental request history",
      error: error.message,
    });
  }
};

// GET /api/rental-requests - Admin list of all applications
const getAllRentalRequests = async (req, res) => {
  try {
    const { status } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};
      if (status && status.trim() && status !== "all") {
        filter.status = status.trim();
      }

      const requests = await RentalRequest.find(filter)
        .populate("tenant", "name email phone role")
        .populate("property", "title location price status")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 });

      const allDocs = await RentalRequest.find();
      const stats = {
        total: allDocs.length,
        pending: allDocs.filter((r) => r.status === "Pending").length,
        approved: allDocs.filter((r) => r.status === "Approved").length,
        rejected: allDocs.filter((r) => r.status === "Rejected").length,
      };

      return res.status(200).json({
        success: true,
        count: requests.length,
        stats,
        requests,
      });
    }

    let allReqs = [...memoryRentalRequests];
    const stats = {
      total: allReqs.length,
      pending: allReqs.filter((r) => r.status === "Pending").length,
      approved: allReqs.filter((r) => r.status === "Approved").length,
      rejected: allReqs.filter((r) => r.status === "Rejected").length,
    };

    if (status && status.trim() && status !== "all") {
      allReqs = allReqs.filter(
        (r) => r.status.toLowerCase() === status.trim().toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: allReqs.length,
      stats,
      requests: allReqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rental requests",
      error: error.message,
    });
  }
};

// GET /api/rental-requests/:id - Inspect specific rental request (Access Validation)
const getRentalRequestById = async (req, res) => {
  const { id } = req.params;

  try {
    let request;

    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        request = await RentalRequest.findById(id)
          .populate("tenant", "name email phone")
          .populate("property", "title location price type status")
          .populate("reviewedBy", "name email");
      }
    } else {
      request = memoryRentalRequests.find((r) => String(r._id) === String(id));
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Rental request not found",
      });
    }

    // ACCESS VALIDATION: Tenant may only view their own requests; Admins can view any request
    const tenantIdStr = request.tenant?._id ? request.tenant._id.toString() : String(request.tenant);
    if (req.user.role !== "admin" && tenantIdStr !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view another tenant's rental request",
      });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving rental request",
      error: error.message,
    });
  }
};

// PATCH /api/rental-requests/:id/status - Approve or reject rental request (Admins Only)
const updateRentalRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, updatePropertyStatus } = req.body;

  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be 'Approved', 'Rejected', or 'Pending'",
    });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid request ID format" });
      }

      const request = await RentalRequest.findById(id);
      if (!request) {
        return res.status(404).json({ success: false, message: "Rental request not found" });
      }

      request.status = status;
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      if (adminNotes !== undefined) request.adminNotes = adminNotes;

      await request.save();

      // Optionally update property status when application is approved
      if (status === "Approved" && updatePropertyStatus && request.property) {
        await Property.findByIdAndUpdate(request.property, { status: "Rented" });
      }

      // Notify tenant of review decision
      createAndEmitNotification({
        recipient: request.tenant,
        sender: req.user.id,
        title: status === "Approved" ? "Application Approved! 🎉" : "Application Status Update",
        message:
          status === "Approved"
            ? `Your application for "${request.propertyTitle}" has been approved! Welcome home.`
            : `Your application for "${request.propertyTitle}" was reviewed and marked as ${status}.`,
        type: status === "Approved" ? "application_approved" : "application_rejected",
        relatedId: String(request._id),
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Rental request marked as ${status}`,
        request,
      });
    }

    // In-memory update
    const index = memoryRentalRequests.findIndex((r) => String(r._id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Rental request not found" });
    }

    memoryRentalRequests[index] = {
      ...memoryRentalRequests[index],
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : memoryRentalRequests[index].adminNotes,
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Notify tenant of review decision in in-memory mode
    createAndEmitNotification({
      recipient: memoryRentalRequests[index].tenant,
      sender: req.user.id,
      title: status === "Approved" ? "Application Approved! 🎉" : "Application Status Update",
      message:
        status === "Approved"
          ? `Your application for "${memoryRentalRequests[index].propertyTitle}" has been approved!`
          : `Your application for "${memoryRentalRequests[index].propertyTitle}" was marked as ${status}.`,
      type: status === "Approved" ? "application_approved" : "application_rejected",
      relatedId: String(id),
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Rental request marked as ${status}`,
      request: memoryRentalRequests[index],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update rental request status",
      error: error.message,
    });
  }
};

// DELETE /api/rental-requests/:id - Cancel or delete rental application
const deleteRentalRequest = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid request ID format" });
      }

      const request = await RentalRequest.findById(id);
      if (!request) {
        return res.status(404).json({ success: false, message: "Rental request not found" });
      }

      // Check ownership: tenant can cancel own request; admins can delete any request
      const tenantIdStr = request.tenant?.toString();
      if (req.user.role !== "admin" && tenantIdStr !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Not authorized to cancel this rental request",
        });
      }

      await RentalRequest.findByIdAndDelete(id);

      // Notify administrator if tenant withdrew application
      if (req.user.role !== "admin") {
        createAndEmitNotification({
          recipient: "admin",
          sender: req.user.id,
          title: "Application Withdrawn",
          message: `${req.user.name || "Tenant"} withdrew their rental application for "${request.propertyTitle}".`,
          type: "application_cancelled",
          relatedId: String(id),
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message: "Rental request cancelled successfully",
      });
    }

    // In-memory deletion
    const index = memoryRentalRequests.findIndex((r) => String(r._id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Rental request not found" });
    }

    const tenantIdStr = String(memoryRentalRequests[index].tenant);
    if (req.user.role !== "admin" && tenantIdStr !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized to cancel this rental request",
      });
    }

    const deletedReq = memoryRentalRequests.splice(index, 1)[0];

    // Notify administrator in in-memory mode
    if (req.user.role !== "admin") {
      createAndEmitNotification({
        recipient: "admin",
        sender: req.user.id,
        title: "Application Withdrawn",
        message: `${req.user.name || "Tenant"} withdrew their rental application for "${deletedReq?.propertyTitle}".`,
        type: "application_cancelled",
        relatedId: String(id),
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Rental request cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel rental request",
      error: error.message,
    });
  }
};

const resetMemoryRentalRequests = (newRequests) => {
  memoryRentalRequests = newRequests ? newRequests.map((r) => ({ ...r })) : [];
  return memoryRentalRequests;
};

const getMemoryRentalRequests = () => memoryRentalRequests;

module.exports = {
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  getRentalRequestById,
  updateRentalRequestStatus,
  deleteRentalRequest,
  resetMemoryRentalRequests,
  getMemoryRentalRequests,
};
